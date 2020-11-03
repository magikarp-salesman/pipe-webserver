import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
});

const blogHandler = async (
  message: api_pipeserver_v0_2,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  try {
    if (message.request.url.startsWith(args.baseUrl)) {
      const path = args.localFolder +
        message.request.url.substring(args.baseUrl.length);
      pipe.debug(`Reading file ${path}`);
      const text = new TextDecoder("utf-8").decode(
        await Deno.readFile(path),
      );
      message.reply.body = text;
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

processPipeMessages<api_pipeserver_v0_2>(blogHandler, "Started blog...");

// vim: ts=2 sts=2 sw=2 tw=0 noet
