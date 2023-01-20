import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  PipeServerAPIv03Cache,
  processPipeMessages,
  utils,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  cacheControl: "no-cache",
});

type PipeServerAPICombo = PipeServerAPIv03 & PipeServerAPIv03Cache;

const cacheHandler = (
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) => {
  // if we have a cache key set add the headers to the file

  if (message.reply.cacheKey) {
    const hash = utils.md5(message.reply.cacheKey);

    if (message.request.cacheKeyMatch == hash) {
      pipe.info("Cache hit, returning 304");
      message.reply.returnCode = 304;
      message.reply.body = undefined;
      message.reply.type = undefined;
    } else {
      pipe.info("Setting cache hash: " + hash);
    }

    message.reply.headers["ETag"] = hash;
    message.reply.headers["Cache-Control"] = args.cacheControl;
  }

  return message;
};

processPipeMessages<PipeServerAPICombo>(
  cacheHandler,
  "cache",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
