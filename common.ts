import { parse } from "https://deno.land/std/flags/mod.ts";
import { api_pipeserver } from "./api/api_v0_1.ts";
import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import { readLines } from "https://deno.land/std@0.77.0/io/bufio.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import {
  Server,
  ServerRequest,
} from "https://deno.land/std@0.77.0/http/server.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";

export type PipeFunctions = {
  message: (message: api_pipeserver) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
};

const pipeFunctions = {
  message: sendPipeMessage,
  info: sendPipeInfo,
  warn: sendPipeWarn,
  error: sendPipeError,
  debug: sendPipeDebug,
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

export async function sendPipeInfo(message: string) {
  const finalMessage: string = `ℹ️  [info ] ${message}\n`;
  await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}

export async function sendPipeWarn(message: string) {
  const finalMessage: string = `⚠  [warn ] ${message}\n`;
  await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}

export async function sendPipeDebug(message: string) {
  const finalMessage: string = `🐛 [debug] ${message}\n`;
  await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}

export async function sendPipeError(message: string, error?: any) {
  const errorMessage = error ? ` (${error})` : "";
  const finalMessage: string = `🔥 [error] ${message}${errorMessage}\n`;
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

async function convertToInternalMessage(
  req: ServerRequest,
): Promise<api_pipeserver_v0_3> {
  const requestBodyBuffer: Uint8Array = await Deno.readAll(req.body);

  let newRequest: api_pipeserver_v0_3 = {
    version: 0.3,
    uuid: v4.generate(),
    request: {
      url: req.url,
      method: req.method.toLowerCase(),
      authorization: req.headers.get("Authorization") ?? undefined,
      ip: (req.conn.remoteAddr as Deno.NetAddr).hostname,
      userAgent: convertToUserAgent(req.headers?.get("User-Agent")),
      payload: base64.fromUint8Array(requestBodyBuffer),
    },
    reply: {
      headers: {},
    },
  };
  return newRequest;
}

function convertToUserAgent(
  userAgent?: string | null,
): "wget" | "curl" | "other" {
  if (userAgent?.toLowerCase().includes("curl")) return "curl";
  if (userAgent?.toLowerCase().includes("wget")) return "wget";
  return "other";
}

const requests: Map<string, ServerRequest> = new Map();
const isReply = (
  req: ServerRequest,
): boolean => (req.url === `/reply` && req.method === `POST`);

async function readReply<T extends api_pipeserver>(
  req: ServerRequest,
): Promise<T> {
  const buf = await Deno.readAll(req.body);
  const body = new TextDecoder("utf-8").decode(buf);
  return JSON.parse(body);
}

export async function receiverProcessor(
  handlerNewMessages: (
    message: api_pipeserver_v0_3,
    pipe: PipeFunctions,
  ) => any,
  handlerReplies: (
    message: api_pipeserver_v0_3,
    req: ServerRequest,
    pipe: PipeFunctions,
  ) => any,
  handlerTimeoutMessages: (
    message: api_pipeserver_v0_3,
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
      readReply<api_pipeserver_v0_3>(req).then((msg: api_pipeserver_v0_3) => {
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
      let ndjson: api_pipeserver_v0_3 = await convertToInternalMessage(req);
      requests.set(ndjson.uuid, req);
      handlerNewMessages(ndjson, pipeFunctions);
    }
  }
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
