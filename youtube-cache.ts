import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

const args = getCommandLineArgs({
  targetLocation: ".youtube_cache/",
  targetExecutable: "youtubedr",
});

/*
    TODO:
    - check if previously downloaded
    - better link regexp
    - better name handling (run youtubedr info first)
    - videos by folder/subfolder
*/

const youtubeCacheHandler = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // if this message doesn't have a body there's nothing to cache here
  if (message.reply.body === undefined) return message;

  const youtubeLinks = message.reply.body.match(
    /\((.*)youtube\.com(.*)v=(.*)\)/g,
  );

  if (youtubeLinks !== null) {
    youtubeLinks.forEach(async (link: string) => {
      const otherLink = link.substr(1, link.length - 2);
      const cmd = [
        args.targetExecutable,
        "download",
        "-d",
        args.targetLocation,
        otherLink,
      ];
      pipe.info(cmd.join(" "));
      const job = Deno.run({
        cmd: cmd,
        stdout: "null",
        stderr: "piped",
      });
      await waitForCompletion(pipe, job);
    });
  }

  // forward immediately the message
  return message;
};

async function waitForCompletion(pipe: PipeFunctions, job: any) {
  const status = await job.status();
  if (status.code != 0) {
    const rawError = await job.stderrOutput();
    pipe.error("error downloading video: " + rawError);
  }
}

processPipeMessages<api_pipeserver_v0_3>(
  youtubeCacheHandler,
  "youtube-cache",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
