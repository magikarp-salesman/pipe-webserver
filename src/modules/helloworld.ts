import {
  getCommandLineArgs,
  PipeServerAPIv01,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  reply: `<html><h1>Hello World!</h1></html>`,
});

const helloWorld = (
  message: PipeServerAPIv01,
) => {
  if (!message.reply.body) {
    message.reply.body = args.reply;
  }
  return Promise.resolve(message);
};

processPipeMessages<PipeServerAPIv01>(helloWorld, "hello-world");

// vim: ts=2 sts=2 sw=2 tw=0 noet
