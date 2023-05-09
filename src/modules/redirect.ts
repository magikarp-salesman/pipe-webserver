import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  baseUrl: "/redirect",
});

const redirectHandler = (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;
  if (!message.request.url.startsWith(args.baseUrl)) return message;

  const url = message.request.url.split("?url=")[1];

  if (url === undefined) {
    pipe.error("URL not found for redirect.");
    return message;
  }

  const body = `
        <!DOCTYPE html>
        <head>
            <script>
                const url = unescape('${url}');
                document.write(url);
                window.location.replace(url); 
            </script>
        </head>
        </body>
        </html>
    `;

  message.reply.body = body;
  message.reply.type = "html";
  message.reply.headers["X-SSR-Options"] = "redirect-links";
  message.reply.headers["X-SSR-Original-Url"] = url;
  message.reply.returnCode = 200;

  pipe.info("Replying with soft redirect to: " + url);

  return message;
};

processPipeMessages<PipeServerAPIv03>(redirectHandler, "redirect");

// vim: ts=2 sts=2 sw=2 tw=0 noet
