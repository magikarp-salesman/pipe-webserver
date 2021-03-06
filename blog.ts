import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
});

const blogHandler = async (
  message: api_pipeserver_v0_3,
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
      if (isHtml) {
        message.reply.body = new TextDecoder("utf-8").decode(fileData);
        message.reply.type = "html";
      } else {
        message.reply.body = base64.fromUint8Array(fileData);
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

processPipeMessages<api_pipeserver_v0_3>(blogHandler, "blog");

// vim: ts=2 sts=2 sw=2 tw=0 noet
