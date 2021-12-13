import {
  api_pipeserver_v0_1,
  getCommandLineArgs,
  processPipeMessages,
} from "./dependencies.ts";

const args = getCommandLineArgs({
  reply: `<html><h1>Hello World!</h1></html>`,
});

const helloWorld = (
  message: api_pipeserver_v0_1,
) => {
  if (!message.reply.body) {
    message.reply.body = args.reply;
  }
  return message;
};

processPipeMessages<api_pipeserver_v0_1>(helloWorld, "hello-world");

// vim: ts=2 sts=2 sw=2 tw=0 noet
