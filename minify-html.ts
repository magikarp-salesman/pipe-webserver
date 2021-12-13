import {
  api_pipeserver_v0_3,
  getCommandLineArgs,
  minifyHTML,
  PipeFunctions,
  processPipeMessages,
} from "./dependencies.ts";

const args = getCommandLineArgs({
  minifyCSS: true,
  minifyJS: true,
});

const minifyHtmlHandler = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // we only care about messages that already contain type=html
  if (message.reply.type !== "html" || message.reply.body === undefined) {
    return message;
  }

  // minify code
  let previousSize = message.reply.body.length;
  let minifiedBody = minifyHTML(message.reply.body, {
    minifyCSS: args.minifyCSS,
    minifyJS: args.minifyJS,
  });
  let newSize = minifiedBody.length;
  let percentage = (100 - ((newSize * 100) / previousSize)).toPrecision(2);
  message.reply.body = minifiedBody;

  pipe.debug(`Size reduced: ${percentage}%`);
  return message;
};

processPipeMessages<api_pipeserver_v0_3>(
  minifyHtmlHandler,
  "minify-html",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
