import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import { api_pipeserver_v0_3_cache } from "./api/api_v0_3_cache.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";
import { createHash } from "https://deno.land/std@0.103.0/hash/mod.ts";

const args = getCommandLineArgs({
  cacheControl: "no-cache",
});

type api_pipe_server_combo = api_pipeserver_v0_3 & api_pipeserver_v0_3_cache;

const cacheHandler = async (
  message: api_pipe_server_combo,
  pipe: PipeFunctions,
) => {
  // if we have a cache key set add the headers to the file

  if (message.reply.cacheKey) {
    const hash = md5(message.reply.cacheKey);

    if (message.request.cacheKeyMatch == hash) {
      pipe.info("Cache hit, returning 304");
      message.reply.returnCode = 304;
      message.reply.body = undefined;
      message.reply.type = undefined;
    } else {
      pipe.info("Adding cache hash: " + hash);
    }

    message.reply.headers["ETag"] = hash;
    message.reply.headers["Cache-Control"] = args.cacheControl;
  }

  return message;
};

const md5 = (value: any) => {
  const hash = createHash("md5");
  hash.update(value);
  return hash.toString();
};

processPipeMessages<api_pipe_server_combo>(
  cacheHandler,
  "cache",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
