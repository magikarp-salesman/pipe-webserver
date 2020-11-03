import { parse } from "https://deno.land/std/flags/mod.ts";
import { api_pipeserver, api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts";

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

export async function processPipeMessagesV1(
  handler: (message: api_pipeserver_v0_1, pipe: PipeFunctions) => any,
  startMessage?: string,
) {
  if (startMessage) sendPipeDebug(startMessage);
  for await (const line of readLines(Deno.stdin)) {
    try {
      const message: api_pipeserver_v0_1 = JSON.parse(line);
      const reply = await handler(message, pipeFunctions);
      if (reply) sendPipeMessage(reply);
    } catch (error) {
      sendPipeError("Could not parse NDJSON", error);
    }
  }
}

export async function processPipeMessagesV2(
  handler: (message: api_pipeserver_v0_2, pipe: PipeFunctions) => any,
  startMessage?: string,
) {
  if (startMessage) sendPipeDebug(startMessage);
  for await (const line of readLines(Deno.stdin)) {
    try {
      const message: api_pipeserver_v0_2 = JSON.parse(line);
      const reply = await handler(message, pipeFunctions);
      if (reply) sendPipeMessage(reply);
    } catch (error) {
      sendPipeError("Could not parse NDJSON", error);
    }
  }
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
