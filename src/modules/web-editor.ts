import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
  utils,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  title: "web-editor",
  mainPage: "/editor",
  editorUrl: "/gotty",
  changeFile: "/root/editor/last-edit",
  autoReloadOnChange: true,
});

const webEditor = async (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  // forward message only if url does not start with the base url
  if (!message.request.url.startsWith(args.mainPage)) return message;

  // forward message if it is already resolved
  if (message.reply.returnCode !== undefined) return message;

  const fileData = await (async () => {
    try {
      return await utils.Uint8ArrayToString(
        Deno.readFile(args.changeFile),
      );
    } catch {
      return "http://magikarp.sale/docs/ 0";
    }
  })();

  pipe.debug(fileData);

  const file = fileData.split(" ")[0];
  const _linenumber = fileData.split(" ")[1];

  pipe.info("Sending main page");

  message.reply.returnCode = 200;
  message.reply.type = "html";
  message.reply.body = `
    
    <!DOCTYPE html>
    <html>
    <head>
        <title>${args.title}</title>
    
        <style>
            html {
                height: 100%;
            }
    
            body {
                height: 100%;
                padding: 0;
                margin: 0;
            }
    
            .container {
                display: table;
                width: 100%;
                height: 100%;
            }
    
            .container div {
                display: table-cell;
                height: 100%;
            }
    
            .container iframe {
                border-style: hidden;
                width: 100%;
                height: 100%;
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <div><iframe name="shell" src="${args.editorUrl}"></iframe></div>
            <div><iframe name="preview" src="${file}"></iframe></div>
        </div>
    </body>
    
    </html>
    
    
    `;

  return message;
};

processPipeMessages<PipeServerAPIv03>(
  webEditor,
  "web-editor",
);
