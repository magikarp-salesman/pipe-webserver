import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import { getCommandLineArgs, processPipeMessagesV1 } from "./common.ts";

const args = getCommandLineArgs({
  reply: `<html><h1>Hello World!</h1></html>`,
});

const helloWorld = async (
  message: api_pipeserver_v0_1,
) => {
  message.reply.body = args.reply;
  return message;
};

processPipeMessagesV1(helloWorld, "Started hello-world...");

// vim: ts=2 sts=2 sw=2 tw=0 noet
