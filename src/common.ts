import {
  base64,
  parse,
  PipeServerAPI,
  PipeServerAPIv03,
  PipeServerAPIv03Cache,
  PipeWebserverModuleHelp,
  printHelp,
  readLines,
  SimpleArgs,
  urlParse,
  utils,
} from "./dependencies.ts";

type PipeServerAPICombo = PipeServerAPIv03 & PipeServerAPIv03Cache;

export type PipeFunctions = {
  message: (message: PipeServerAPI) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  // deno-lint-ignore no-explicit-any
  error: (message: string, error?: any) => void;

  debug: (message: string) => void;
};

const pipeFunctions = (moduleName: string): PipeFunctions => {
  const paddedModuleName = utils.paddedLowercase()(moduleName);
  return {
    message: sendPipeMessage(paddedModuleName),
    info: sendPipeInfo(paddedModuleName),
    warn: sendPipeWarn(paddedModuleName),
    error: sendPipeError(paddedModuleName),
    debug: sendPipeDebug(paddedModuleName),
  };
};

export function getCommandLineArgs(defaults: Record<string, unknown>) {
  const allValues = {
    ...defaults,
    ...parse(Deno.args),
  };

  return allValues;
}

export const sendPipeMessage = (_moduleName: string) =>
  (message: PipeServerAPI) => {
    console.log(JSON.stringify(message));
  };

export const sendPipeInfo = (moduleName: string) =>
  async (message: string) => {
    const finalMessage = `ℹ️\t[info ][${moduleName}] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export const sendPipeWarn = (moduleName: string) =>
  async (message: string) => {
    const finalMessage = `⚠\t[warn ][${moduleName}] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export const sendPipeDebug = (moduleName: string) =>
  async (message: string) => {
    const finalMessage = `🐛\t[debug][${moduleName}] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export const sendPipeError = (moduleName: string) =>
  // deno-lint-ignore no-explicit-any
  async (message: string, error?: any) => {
    const errorMessage = error ? ` (${error})` : "";
    const finalMessage =
      `🔥\t[error][${moduleName}] ${message}${errorMessage}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export async function processPipeMessages<T>(
  handler: (
    message: T,
    pipe: PipeFunctions,
  ) => Promise<PipeServerAPI> | PipeServerAPI | undefined | void,
  moduleName: string,
  startMessage = `Started handler...`,
  help?: PipeWebserverModuleHelp,
  args?: SimpleArgs,
) {
  const pipe = pipeFunctions(moduleName);
  if (help && args && args["help"]) {
    // print help message and finish
    console.log(printHelp(help));
    return;
  }
  // TODO: pass a different pipe object for each message so the logs already contain the info of which message it is processing
  pipe.debug(startMessage);
  for await (const line of readLines(Deno.stdin)) {
    let message, reply;
    try {
      message = JSON.parse(line);
    } catch (error) {
      pipe.error("Could not parse NDJSON", error);
      pipe.error(line);
      return;
    }
    try {
      reply = await handler(message, pipe);
    } catch (error) {
      pipe.error("Internal error ", error);
      pipe.debug("Forwarding original message...");
      pipe.message(message);
    }
    if (reply) {
      pipe.message(reply);
    } else {
      pipe.debug("Dropped message...");
    }
  }
}

async function convertToInternalMessage(
  req: Deno.RequestEvent,
  conn: Deno.Conn,
): Promise<PipeServerAPICombo> {
  const requestBodyBuffer = await utils.readableStreamToUint8Array(
    req.request.body,
  );

  const parsedUrl = urlParse(req.request.url);
  const position = req.request.url.indexOf(parsedUrl.pathname);
  const cutUrl = req.request.url.slice(position);

  const newRequest: PipeServerAPICombo = {
    version: 0.3,
    uuid: utils.uuid.generate(),
    request: {
      url: cutUrl,
      method: req.request.method.toLowerCase(),
      authorization: req.request.headers.get("Authorization") ?? undefined,
      ip: (conn.remoteAddr as Deno.NetAddr).hostname,
      userAgent: convertToUserAgent(req.request.headers?.get("User-Agent")),
      payload: base64.encode(requestBodyBuffer),
      cacheKeyMatch: req.request.headers.get("If-None-Match") ?? undefined,
    },
    reply: {
      headers: {},
    },
  };
  return newRequest;
}

function convertToUserAgent(
  userAgent?: string | null,
): "wget" | "curl" | "browser" | "vim" {
  if (userAgent?.toLowerCase().includes("curl")) return "curl";
  if (userAgent?.toLowerCase().includes("vim")) return "vim";
  if (userAgent?.toLowerCase().includes("wget")) return "wget";
  return "browser";
}

const requests: Map<string, Deno.RequestEvent> = new Map();
const isReply = (
  req: Deno.RequestEvent,
): boolean => (urlParse(req.request.url).pathname === `/reply` &&
  req.request.method === `POST`);

async function readReply<T extends PipeServerAPI>(
  req: Deno.RequestEvent,
): Promise<T> {
  const requestBodyBuffer = utils.readableStreamToUint8Array(req.request.body);
  const body = await utils.Uint8ArrayToString(requestBodyBuffer);
  return JSON.parse(body);
}

export async function receiverProcessor(
  handlerNewMessages: (
    message: PipeServerAPIv03,
    pipe: PipeFunctions,
  ) => void,
  handlerReplies: (
    message: PipeServerAPIv03,
    req: Deno.RequestEvent,
    pipe: PipeFunctions,
  ) => void,
  // deno-lint-ignore no-unused-vars
  handlerTimeoutMessages: (
    message: PipeServerAPIv03,
    req: Deno.RequestEvent,
    pipe: PipeFunctions,
  ) => void,
  server: Deno.Listener,
  moduleName = "receiver",
  startMessage = `Started handler...`,
) {
  const pipe = pipeFunctions(moduleName);
  pipe.debug(startMessage);

  // handles the request itself
  const reqHandler = async (req: Deno.RequestEvent, conn: Deno.Conn) => {
    if (isReply(req)) {
      // read the reply request
      readReply<PipeServerAPIv03>(req).then((msg: PipeServerAPIv03) => {
        pipe.debug(`Sending reply...`);
        const reqObject: Deno.RequestEvent | undefined = requests.get(
          msg.uuid,
        )!;
        if (reqObject) {
          handlerReplies(msg, reqObject, pipe);
          requests.delete(msg.uuid);
        } else {
          pipe.error(`Request not found. ${msg.uuid}`);
        }
      }).catch((err) => {
        pipe.error(`Error sending reply.`, err);
      });
    } else {
      // handle the new request
      pipe.debug(`Received request`);
      const ndjson: PipeServerAPIv03 = await convertToInternalMessage(
        req,
        conn,
      );
      requests.set(ndjson.uuid, req);
      handlerNewMessages(ndjson, pipe);
    }
  };

  // handles http requests
  const httpHandler = async (conn: Deno.Conn) => {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
      reqHandler(requestEvent, conn);
    }
  };

  // handles connections
  for await (const conn of server) {
    httpHandler(conn);
  }
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
