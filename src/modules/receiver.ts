import {
  base64,
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  receiverProcessor,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  port: 8000,
});

function handlerNewMessages(message: PipeServerAPIv03, pipe: PipeFunctions) {
  pipe.info("Received request: " + message.request.url);
  pipe.message(message);
}

function handlerReplies(
  message: PipeServerAPIv03,
  req: Deno.RequestEvent,
  pipe: PipeFunctions,
) {
  let body: string | Uint8Array = message.reply.body!;
  if (message.reply.type === "base64") {
    pipe.debug("Converting base64 file...");
    body = base64.decode(message.reply.body!);
  }

  const initHeaders = { "Content-Type": "text/html;charset=UTF-8" };

  const newObject: Response = new Response(body, {
    status: message.reply.returnCode ?? 200,
    headers: new Headers(initHeaders),
  });

  Object.entries(message.reply.headers).forEach((item: [string, unknown]) => {
    newObject.headers!.append(item[0], String(item[1]));
  });

  req.respondWith(newObject).catch((exception) => {
    pipe.warn("Could not reply to client " + exception);
  });
}

function handlerTimeoutMessages(
  message: PipeServerAPIv03,
  req: Deno.RequestEvent,
  pipe: PipeFunctions,
) {
  pipe.debug("Message timedout: " + message.uuid + " - " + message.request.url);
  const response: Response = new Response(null, {
    status: 408,
  });
  req.respondWith(response);
}

const server = Deno.listen({ port: args.port });

receiverProcessor(
  handlerNewMessages,
  handlerReplies,
  handlerTimeoutMessages,
  server,
  "receiver",
  `Starting receiver on port: ${args.port}`,
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
