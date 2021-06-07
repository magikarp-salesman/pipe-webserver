import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";
import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

const args = getCommandLineArgs({
  realm: "pipe-server authentication",
  accepted: "pipe:server",
  allowedForXMinutes: 5,
});

const allowedIpAddresses: Map<string, number> = new Map<string, number>();

const basicAuth = async (message: api_pipeserver_v0_3, pipe: PipeFunctions) => {
  let { authorization, ip } = message.request;
  authorization = authorization ?? "";
  ip = ip ?? "";
  message = removeUnneededInfo(message); // remove extra info forward

  // if ip is already allowed skip authentication
  const lastTimestamp = allowedIpAddresses.get(ip) ?? 0;
  const hasAccessedInTheLastTimestamp =
    lastTimestamp > Date.now().valueOf() - args.allowedForXMinutes * 60 * 1000;

  if (hasAccessedInTheLastTimestamp) {
    pipe.debug(`Request auto-allowed for hostname ${ip}`);
    allowedIpAddresses.set(ip, Date.now().valueOf()); // reset timestamp for next X minutes
    return message;
  }

  if (!authorization.startsWith("Basic ")) {
    pipe.debug("Request blocked - missing authorization");
    message.reply.returnCode = 401;
    message.reply.headers["WWW-Authenticate"] = `Basic realm="${args.realm}"`;
    return message;
  }

  let decodedAuthorization = (new TextDecoder("utf8")).decode(
    base64.toUint8Array(authorization.substring(6)),
  );
  if (decodedAuthorization != args.accepted) {
    message.reply.returnCode = 403;
    pipe.debug("Request blocked - invalid credentials");
  } else {
    pipe.debug(`Request authorized, adding '${ip}' to allowed ip list`);
    allowedIpAddresses.set(ip, Date.now().valueOf()); // reset timestamp for next X minutes
  }

  return message;
};

const removeUnneededInfo = (
  message: api_pipeserver_v0_3,
): api_pipeserver_v0_3 => ({
  ...message,
  request: {
    ...message.request,
    authorization: undefined,
    ip: undefined,
  },
});

processPipeMessages<api_pipeserver_v0_3>(
  basicAuth,
  "timed-basic-auth",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
