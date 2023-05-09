import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
  utils,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  basePath: "/docs/",
  baseFolder: "./docs/",
});

const vimToMarkdownHandler = async (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  if (message.reply.type !== undefined) {
    return message;
  }

  if (!message.request.url.endsWith(".vim")) {
    return message;
  }

  if (message.request.userAgent !== "browser") {
    return message;
  }

  pipe.debug("Converting vim file to markdown");

  const info = await utils.urlMapped(
    args.basePath,
    args.baseFolder,
    message.request.fullUrl,
  );

  if (!info.exists) {
    // file does not exist so no need to convert
    return message;
  }

  message.reply.body = `
---
title: ${message.request.url}
---
  {!${info.filename}!code!vim!}`;
  message.reply.type = "markdown";

  return message;
};

processPipeMessages<PipeServerAPIv03>(
  vimToMarkdownHandler,
  "vim-to-markdown",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
