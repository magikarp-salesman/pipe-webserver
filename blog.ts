import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts";
import { getCommandLineArgs, sendPipeMessage, sendPipeError, sendPipeDebug } from "./common.ts"

const args = getCommandLineArgs({
    baseUrl: "/docs",
    localFolder: "./docs"
});

async function main() {
    for await (const line of readLines(Deno.stdin)) {
        try {
            var message:api_pipeserver_v0_1 = JSON.parse(line);
            if(message.request.url.startsWith(args.baseUrl)){
                const path = args.localFolder + message.request.url.substring(args.baseUrl.length);
                sendPipeDebug(`Reading file ${path}`);
                const text = new TextDecoder('utf-8').decode(await Deno.readFile(path));
                message.reply.body = text;
                sendPipeMessage(message);
            }
        } catch(err){
            sendPipeError("Could not parse NDJSON or read file." + err);
        }
    }
}

sendPipeDebug("Started blog...");
main();
