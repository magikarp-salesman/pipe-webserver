import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

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
    - run the downloader without checking for the certificates
*/

const youtubeCacheHandler = (
  message: PipeServerAPIv03,
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

async function waitForCompletion(pipe: PipeFunctions, job: Deno.Process) {
  const status = await job.status();
  if (status.code != 0) {
    const rawError = await job.stderrOutput();
    const errorString = new TextDecoder().decode(rawError);
    pipe.error("error downloading video: " + errorString);
  }
}

processPipeMessages<PipeServerAPIv03>(
  youtubeCacheHandler,
  "youtube-cache",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
