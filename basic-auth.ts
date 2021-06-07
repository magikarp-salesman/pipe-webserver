import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";
import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

const args = getCommandLineArgs({
  realm: "pipe-server authentication",
  accepted: `pipe:server`,
});

const basicAuth = async (message: api_pipeserver_v0_2, pipe: PipeFunctions) => {
  let { authorization } = message.request;
  authorization = authorization ?? "";

  if (!authorization.startsWith("Basic ")) {
    pipe.debug("Request blocked - missing authorization");
    message.reply.returnCode = 401;
    message.reply.headers["WWW-Authenticate"] = `Basic realm="${args.realm}"`;
  } else {
    let decodedAuthorization = (new TextDecoder("utf8")).decode(
      base64.toUint8Array(authorization.substring(6)),
    );
    if (decodedAuthorization != args.accepted) {
      message.reply.returnCode = 403;
      pipe.debug("Request blocked - invalid credentials");
    } else {
      pipe.debug("Request authorized");
    }
  }

  return message;
};

processPipeMessages<api_pipeserver_v0_2>(basicAuth, "basic-auth");

// vim: ts=2 sts=2 sw=2 tw=0 noet
