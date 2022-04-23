import {
  base64,
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  PipeServerAPIv03Cache,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
  defaultIndexFile: "index.html",
});

type PipeServerAPICombo = PipeServerAPIv03 & PipeServerAPIv03Cache;

const blogHandler = async (
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  try {
    if (message.request.url.startsWith(args.baseUrl)) {
      const path = args.localFolder +
        message.request.url.substring(args.baseUrl.length);

      const isHtml = message.request.url.toLowerCase().endsWith("html");

      const isJpeg = message.request.url.toLowerCase().endsWith("jpg") ||
        message.request.url.toLowerCase().endsWith("jpeg");

      const isPng = message.request.url.toLowerCase().endsWith("png");

      pipe.debug(`Reading file ${path}`);

      const statDir = await Deno.lstat(path);
      const finalPath = (statDir.isDirectory)
        ? path + args.defaultIndexFile
        : path;

      const fileData = await Deno.readFile(finalPath);
      const stat = await Deno.lstat(path);

      message.reply.cacheKey = stat.mtime?.toString() || "";
      if (isHtml) {
        message.reply.body = new TextDecoder("utf-8").decode(fileData);
        message.reply.type = "html";
      } else {
        message.reply.body = base64.encode(fileData);
        message.reply.type = "base64";
        if (isJpeg) message.reply.headers["Content-Type"] = "image/jpeg";
        if (isPng) message.reply.headers["Content-Type"] = "image/png";
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

processPipeMessages<PipeServerAPICombo>(blogHandler, "blog");

// vim: ts=2 sts=2 sw=2 tw=0 noet
