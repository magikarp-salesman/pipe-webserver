import {
  base64,
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv02,
  PipeWebserverModuleHelp,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  realm: "pipe-server authentication",
  accepted: `pipe:server`,
});

const help: PipeWebserverModuleHelp = {
  moduleName: "basic-auth",
  description:
    "A simple module to support basic HTTP auth, checks against a known password and returns 401 if missing the authorization",
  examples: [
    "receiver | basic-auth --accepted 'meme:letmein' --realm 'my-server' | ... | emitter",
    "receiver | public-stuff | basic-auth | private-blog | emitter",
  ],
  options: args,
  jsonApi: [],
};

const basicAuth = (message: PipeServerAPIv02, pipe: PipeFunctions) => {
  let { authorization } = message.request;
  authorization = authorization ?? "";

  if (!authorization.startsWith("Basic ")) {
    pipe.debug("Request blocked - missing authorization");
    message.reply.returnCode = 401;
    message.reply.headers["WWW-Authenticate"] = `Basic realm="${args.realm}"`;
  } else {
    const decodedAuthorization = base64.decodeUnicode(
      authorization.substring(6),
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

processPipeMessages<PipeServerAPIv02>(
  basicAuth,
  "basic-auth",
  undefined,
  help,
  args,
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
