import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts";
import {
  getCommandLineArgs,
  sendPipeDebug,
  sendPipeError,
  sendPipeMessage,
} from "./common.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
});

async function main() {
  for await (const line of readLines(Deno.stdin)) {
    try {
      var message: api_pipeserver_v0_2 = JSON.parse(line);
      if (message.reply.returnCode) {
        sendPipeMessage(message);
        continue;
      }
      try {
        if (message.request.url.startsWith(args.baseUrl)) {
          const path = args.localFolder +
            message.request.url.substring(args.baseUrl.length);
          sendPipeDebug(`Reading file ${path}`);
          const text = new TextDecoder("utf-8").decode(
            await Deno.readFile(path),
          );
          message.reply.body = text;
          sendPipeMessage(message);
        } else {
          message.reply.body = "Not found";
          message.reply.returnCode = 404;
          sendPipeMessage(message);
        }
      } catch (err) {
        sendPipeError("Could not read file." + err);
        message.reply.body = "Not found";
        message.reply.returnCode = 404;
        sendPipeMessage(message);
      }
    } catch (err) {
      sendPipeError("Could not parse NDJSON" + err);
    }
  }
}

sendPipeDebug("Started blog...");
main();

// vim: ts=2 sts=2 sw=2 tw=0 noet
