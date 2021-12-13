import {
  api_pipeserver_v0_3,
  api_pipeserver_v0_3_cache,
  base64,
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./dependencies.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
});

type api_pipe_server_combo = api_pipeserver_v0_3 & api_pipeserver_v0_3_cache;

const blogHandler = async (
  message: api_pipe_server_combo,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  try {
    if (message.request.url.startsWith(args.baseUrl)) {
      const path = args.localFolder +
        message.request.url.substring(args.baseUrl.length);

      const isHtml = message.request.url.toLowerCase().endsWith("html");
      pipe.debug(`Reading file ${path}`);

      const fileData = await Deno.readFile(path);
      const stat = await Deno.lstat(path);
      message.reply.cacheKey = stat.mtime?.toString() || "";
      if (isHtml) {
        message.reply.body = new TextDecoder("utf-8").decode(fileData);
        message.reply.type = "html";
      } else {
        message.reply.body = base64.encode(fileData);
        message.reply.type = "base64";
      }
    } else {
      message.reply.body = "Not found";
      message.reply.returnCode = 404;
    }
    return message;
  } catch (err) {
    pipe.error("Could not read file." + err);
    message.reply.body = "Not found";
    message.reply.returnCode = 404;
    return message;
  }
};

processPipeMessages<api_pipe_server_combo>(blogHandler, "blog");

// vim: ts=2 sts=2 sw=2 tw=0 noet
