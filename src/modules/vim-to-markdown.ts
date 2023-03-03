import {
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

const vimToMarkdownHandler = (
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

  message.reply.body = `
---
title: ${message.request.url}
---
  {!${message.request.url}!code!vim!}`;
  message.reply.type = "markdown";

  return message;
};

processPipeMessages<PipeServerAPIv03>(
  vimToMarkdownHandler,
  "vim-to-markdown",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
