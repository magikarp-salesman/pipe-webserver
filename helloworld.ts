import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts";
import { getCommandLineArgs, sendPipeMessage, sendPipeError, sendPipeDebug } from "./common.ts"

const args = getCommandLineArgs({
    reply: `<html><h1>Hello World</h1></html>`
});

async function main() {
    for await (const line of readLines(Deno.stdin)) {
        try {
            var message:api_pipeserver_v0_1 = JSON.parse(line);
            message.reply.body = args.reply;
            sendPipeMessage(message);
        } catch(err){
            sendPipeError("Could not parse NDJSON");
        }
    }
}

sendPipeDebug("Started hello-world...");
main();
