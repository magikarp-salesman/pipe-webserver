import {
  api_pipeserver_v0_3,
  base64,
  getCommandLineArgs,
  PipeFunctions,
  receiverProcessor,
  Response,
  serve,
  Server,
  ServerRequest,
} from "./dependencies.ts";

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
    body = base64.decode(message.reply.body!!);
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
  const response: Response = {
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
