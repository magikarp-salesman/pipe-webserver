import {
  exists,
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
  Queue,
  runProcessAndWait,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  targetLocation: ".youtube_cache/",
  targetExecutable: "youtubedr",
});

/*
    TODO:
    - better link regexp
    - videos by folder/subfolder
*/

const queueDownloading = new Queue();
const currentlyDownloading: string[] = [];

const youtubeCacheHandler = (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  // if this message doesn't have a body there's nothing to cache here
  if (message.reply.body === undefined) return message;

  // pause the queue temporarily
  queueDownloading.stop();

  const youtubeLinks = message.reply.body.match(
    /\((.*)youtube\.com(.*)v=(.*)\)/g,
  );

  if (youtubeLinks !== null) {
    youtubeLinks.forEach((link: string) => {
      const otherLink = link.substr(1, link.length - 2);
      if (currentlyDownloading.includes(otherLink)) {
        pipe.debug(`Already downloading file for: ${otherLink}`);
        return;
      }

      currentlyDownloading.push(otherLink);

      queueDownloading.push(async () => {
        const filename = await findVideoTitleAndConvert(otherLink, pipe);
        const fileExists = await exists(args.targetLocation + "/" + filename);
        if (fileExists) {
          pipe.info(
            `File already exists, not downloading. ${
              args.targetLocation + "/" + filename
            }`,
          );
        } else {
          const cmd = [
            args.targetExecutable,
            "download",
            "--insecure",
            "--directory",
            args.targetLocation,
            "--filename",
            filename,
            otherLink,
          ];
          pipe.debug(cmd.join(" "));
          await runProcessAndWait(cmd);
          pipe.info(`Finished downloading: ${filename}`);
        }
        delete currentlyDownloading[currentlyDownloading.indexOf(otherLink)];
      });
    });
  }

  // start processing stuff
  queueDownloading.start();

  // forward immediately the message and keep downloading
  return message;
};

async function findVideoTitleAndConvert(videoUrl: string, pipe: PipeFunctions) {
  const cmd = [
    args.targetExecutable,
    "info",
    "--insecure",
    videoUrl,
  ];
  pipe.info(`Getting video info for ${videoUrl}`);
  const { output } = await runProcessAndWait(cmd);
  const titleRaw =
    output.split("\n").filter((s) => s.includes("Title:")).map((s) =>
      s.trim().split("Title:")[1]
    )[0];
  const newTitle = titleRaw.toLowerCase().replace(/[\W_]+/g, "_") + ".mp4";

  return newTitle;
}

processPipeMessages<PipeServerAPIv03>(
  youtubeCacheHandler,
  "youtube-cache",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
