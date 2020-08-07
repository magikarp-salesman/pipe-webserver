import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts";
import { getCommandLineArgs, sendPipeMessage, sendPipeError, sendPipeDebug } from "./common.ts"

const args = getCommandLineArgs({
    filterUrl: "/api"
});

async function main() {
    for await (const line of readLines(Deno.stdin)) {
        try {
            var message:api_pipeserver_v0_1 = JSON.parse(line);
            if(message.request.url === args.filterUrl){
                // forward message only if url is allowed
                sendPipeMessage(message);
            } else {
                sendPipeDebug(`Filtered message with url: ${message.request.url}`);
            }
        } catch(err){
            sendPipeError("Could not parse NDJSON");
        }
    }
}

sendPipeDebug("Started filter...");
main();
