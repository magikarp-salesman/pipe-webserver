import { parse } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { api_pipeserver } from "./api/api_v0_1.ts";
import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import { api_pipeserver_v0_3_cache } from "./api/api_v0_3_cache.ts";
import { readLines } from "https://deno.land/std@0.97.0/io/bufio.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import {
  Server,
  ServerRequest,
} from "https://deno.land/std@0.97.0/http/server.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";

type api_pipe_server_combo = api_pipeserver_v0_3 & api_pipeserver_v0_3_cache;

export type PipeFunctions = {
  message: (message: api_pipeserver) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
};

const pipeFunctions = (moduleName: string): PipeFunctions => {
  const paddedModuleName = moduleName.toLowerCase().substr(0, 20).padStart(
    20,
    " ",
  );
  return {
    message: sendPipeMessage(paddedModuleName),
    info: sendPipeInfo(paddedModuleName),
    warn: sendPipeWarn(paddedModuleName),
    error: sendPipeError(paddedModuleName),
    debug: sendPipeDebug(paddedModuleName),
  };
};

export function getCommandLineArgs(defaults: Record<string, unknown>) {
  return {
    ...defaults,
    ...parse(Deno.args),
  };
}

export const sendPipeMessage = (_moduleName: string) =>
  (message: api_pipeserver) => {
    console.log(JSON.stringify(message));
  };

export const sendPipeInfo = (moduleName: string) =>
  async (message: string) => {
    const finalMessage: string = `ℹ️  [info ][${moduleName}] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export const sendPipeWarn = (moduleName: string) =>
  async (message: string) => {
    const finalMessage: string = `⚠  [warn ][${moduleName}] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export const sendPipeDebug = (moduleName: string) =>
  async (message: string) => {
    const finalMessage: string = `🐛 [debug][${moduleName}] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export const sendPipeError = (moduleName: string) =>
  async (message: string, error?: any) => {
    const errorMessage = error ? ` (${error})` : "";
    const finalMessage: string =
      `🔥 [error][${moduleName}] ${message}${errorMessage}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
  };

export async function processPipeMessages<T>(
  handler: (message: T, pipe: PipeFunctions) => any,
  moduleName: string,
  startMessage: string = `Started handler...`,
) {
  const pipe = pipeFunctions(moduleName);
  pipe.debug(startMessage);
  for await (const line of readLines(Deno.stdin)) {
    try {
      const message: T = JSON.parse(line);
      const reply = await handler(message, pipe);
      if (reply) pipe.message(reply);
    } catch (error) {
      pipe.error("Could not parse NDJSON", error);
    }
  }
}

async function convertToInternalMessage(
  req: ServerRequest,
): Promise<api_pipe_server_combo> {
  const requestBodyBuffer: Uint8Array = await Deno.readAll(req.body);

  let newRequest: api_pipe_server_combo = {
    version: 0.3,
    uuid: v4.generate(),
    request: {
      url: req.url,
      method: req.method.toLowerCase(),
      authorization: req.headers.get("Authorization") ?? undefined,
      ip: (req.conn.remoteAddr as Deno.NetAddr).hostname,
      userAgent: convertToUserAgent(req.headers?.get("User-Agent")),
      payload: base64.fromUint8Array(requestBodyBuffer),
      cacheKeyMatch: req.headers.get("If-None-Match") ?? undefined,
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
  moduleName: string = "receiver",
  startMessage: string = `Started handler...`,
) {
  const pipe = pipeFunctions(moduleName);
  pipe.debug(startMessage);
  for await (const req of server) {
    if (isReply(req)) {
      // read the reply request
      readReply<api_pipeserver_v0_3>(req).then((msg: api_pipeserver_v0_3) => {
        pipe.debug(`Sending reply...`);
        const reqObject: ServerRequest | undefined = requests.get(msg.uuid)!!;
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
      let ndjson: api_pipeserver_v0_3 = await convertToInternalMessage(req);
      requests.set(ndjson.uuid, req);
      handlerNewMessages(ndjson, pipe);
    }
  }
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
