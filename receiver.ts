import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  Response,
  serve,
  Server,
  ServerRequest,
} from "https://deno.land/std@0.97.0/http/server.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  receiverProcessor,
} from "./common.ts";

const args = getCommandLineArgs({
  port: 8000,
});

const server: Server = serve({ port: args.port });

function handlerNewMessages(message: api_pipeserver_v0_3, pipe: PipeFunctions) {
  pipe.message(message);
}

function handlerReplies(
  message: api_pipeserver_v0_3,
  req: ServerRequest,
  pipe: PipeFunctions,
) {
  let body: string | Uint8Array = message.reply.body!!;
  if (message.reply.type === "base64") {
    pipe.debug("Converting base64 file...");
    body = base64.toUint8Array(message.reply.body!!);
  }

  let newObject: Response = {
    body,
    status: message.reply.returnCode ?? 200,
    headers: new Headers(),
  };

  Object.entries(message.reply.headers).forEach((item: [string, unknown]) => {
    newObject.headers!!.append(item[0], String(item[1]));
  });
  req.respond(newObject);
}

function handlerTimeoutMessages(
  message: api_pipeserver_v0_3,
  req: ServerRequest,
  pipe: PipeFunctions,
) {
  let response: Response = {
    status: 408,
  };
  req.respond(response);
}

receiverProcessor(
  handlerNewMessages,
  handlerReplies,
  handlerTimeoutMessages,
  server,
  "receiver",
  `Starting receiver on port: ${args.port}`,
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
