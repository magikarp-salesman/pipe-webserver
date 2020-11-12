import { parse } from "https://deno.land/std/flags/mod.ts";
import { api_pipeserver } from "./api/api_v0_1.ts";
import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import { readLines } from "https://deno.land/std@0.77.0/io/bufio.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import {
  Server,
  ServerRequest,
} from "https://deno.land/std@0.77.0/http/server.ts";

export type PipeFunctions = {
  message: (message: api_pipeserver) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
};

const pipeFunctions = {
  message: sendPipeMessage,
  debug: sendPipeDebug,
  error: sendPipeError,
};

export function getCommandLineArgs(defaults: Record<string, unknown>) {
  return {
    ...defaults,
    ...parse(Deno.args),
  };
}

export function sendPipeMessage(message: api_pipeserver) {
  console.log(JSON.stringify(message));
}

export async function sendPipeDebug(message: string) {
  const finalMessage: string = `[ps] [debug] ${message}\n`;
  await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}

export async function sendPipeError(message: string, error?: any) {
  const errorMessage = error ? ` (${error})` : "";
  const finalMessage: string = `[ps] [error] ${message}${errorMessage}\n`;
  await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}

export async function processPipeMessages<T>(
  handler: (message: T, pipe: PipeFunctions) => any,
  startMessage?: string,
) {
  if (startMessage) sendPipeDebug(startMessage);
  for await (const line of readLines(Deno.stdin)) {
    try {
      const message: T = JSON.parse(line);
      const reply = await handler(message, pipeFunctions);
      if (reply) sendPipeMessage(reply);
    } catch (error) {
      sendPipeError("Could not parse NDJSON", error);
    }
  }
}

function convertToInternalMessage(req: any): api_pipeserver_v0_2 {
  let newRequest: api_pipeserver_v0_2 = {
    version: 0.2,
    uuid: v4.generate(),
    request: {
      url: req.url,
      method: req.method.toLowerCase(),
      authorization: req.headers.get("Authorization") ?? undefined,
    },
    reply: {
      base64: false,
      headers: {},
    },
  };
  return newRequest;
}

const requests: Map<string, ServerRequest> = new Map();
const isReply = (
  req: ServerRequest,
): boolean => (req.url === `/reply` && req.method === `POST`);

async function readReply<T extends api_pipeserver>(req: ServerRequest): Promise<T> {
  const buf = await Deno.readAll(req.body);
  const body = new TextDecoder("utf-8").decode(buf);
  return JSON.parse(body);
}

export async function receiverProcessor(
  handlerNewMessages: (
    message: api_pipeserver_v0_2,
    pipe: PipeFunctions,
  ) => any,
  handlerReplies: (
    message: api_pipeserver_v0_2,
    req: ServerRequest,
    pipe: PipeFunctions,
  ) => any,
  handlerTimeoutMessages: (
    message: api_pipeserver_v0_2,
    req: ServerRequest,
    pipe: PipeFunctions,
  ) => any,
  server: Server,
  startMessage?: string,
) {
  if (startMessage) sendPipeDebug(startMessage);
  for await (const req of server) {
    if (isReply(req)) {
      // read the reply request
      readReply<api_pipeserver_v0_2>(req).then((msg: api_pipeserver_v0_2) => {
        sendPipeDebug(`Sending reply...`);
        const reqObject: ServerRequest | undefined = requests.get(msg.uuid)!!;
        if (reqObject) {
          handlerReplies(msg, reqObject, pipeFunctions);
          requests.delete(msg.uuid);
        } else {
          sendPipeError(`Request not found. ${msg.uuid}`);
        }
      }).catch((err) => {
        sendPipeError(`Error sending reply. ${err}`);
      });
    } else {
      // handle the new request
      sendPipeDebug(`Received request`);
      let ndjson: api_pipeserver_v0_2 = convertToInternalMessage(req);
      requests.set(ndjson.uuid, req);
      handlerNewMessages(ndjson, pipeFunctions);
    }
  }
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
