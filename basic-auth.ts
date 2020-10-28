import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts";
import {
  getCommandLineArgs,
  sendPipeDebug,
  sendPipeError,
  sendPipeMessage,
} from "./common.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";

const args = getCommandLineArgs({
  realm: "pipe-server authentication",
  accepted: `pipe:server`,
});

async function main() {
  for await (const line of readLines(Deno.stdin)) {
    try {
      var message: api_pipeserver_v0_2 = JSON.parse(line);

      let { authorization } = message.request;
      authorization = authorization ?? "";

      if (!authorization.startsWith("Basic ")) {
        sendPipeDebug("Request blocked - missing authorization");
        message.reply.returnCode = 401;
        message.reply.headers["WWW-Authenticate"] = 'Basic realm="' +
          args.realm + '"';
      } else {
        let decodedAuthorization = (new TextDecoder("utf8")).decode(
          base64.toUint8Array(authorization.substring(6)),
        );
        if (decodedAuthorization != args.accepted) {
          message.reply.returnCode = 403;
          sendPipeDebug("Request blocked - invalid credentials");
        } else {
          sendPipeDebug("Request authorized");
        }
      }
      sendPipeMessage(message);
    } catch (error) {
      sendPipeError("Could not parse NDJSON", error);
    }
  }
}

sendPipeDebug("Started basic auth...");
main();

// vim: ts=2 sts=2 sw=2 tw=0 noet
