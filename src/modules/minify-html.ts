import {
  getCommandLineArgs,
  minifyHTML,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  minifyCSS: true,
  minifyJS: true,
});

// TODO: skip if error while minimizing

const minifyHtmlHandler = (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  // we only care about messages that already contain type=html
  if (message.reply.type !== "html" || message.reply.body === undefined) {
    return Promise.resolve(message);
  }

  // minify code
  const previousSize = message.reply.body.length;
  const minifiedBody = minifyHTML(message.reply.body, {
    minifyCSS: args.minifyCSS,
    minifyJS: args.minifyJS,
  });
  const newSize = minifiedBody.length;
  const percentage = (100 - ((newSize * 100) / previousSize)).toPrecision(2);
  message.reply.body = minifiedBody;

  pipe.info(`Size reduced: ${percentage}%`);
  return Promise.resolve(message);
};

processPipeMessages<PipeServerAPIv03>(
  minifyHtmlHandler,
  "minify-html",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
