import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";

/*

  TODO: implement {!include.md!} tags
  for each tag, find the file, read it with deno and include it on the final response

  implement a index that includes all the files automatically by alphabetical order

  add graphviz support
  fix images support

*/

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
});

const vimEditorHandler = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  // don't handle any message that is not requesting a .md file starting on the baseURL
  if (
    !message.request.url.startsWith(args.baseUrl) ||
    !message.request.url.endsWith(".md")
  ) {
    return message; // forward the message
  }

  if (message.request.userAgent == "other") {
    // just show the html page if present
    return await handleShowFile(message, pipe);
  }

  if (message.request.userAgent == "wget") {
    // this is a request from vim, send the raw file
    return await handleShowRawFile(message, pipe);
  }

  if (message.request.userAgent == "curl" && message.request.method === "put") {
    // this is a update request from vim
    return await handleUpdateFile(message, pipe);
  }

  // unknown case, show an error
  pipe.error(`Could not handle request: ${message.request.url}`);
  return message; // forward message
};

const htmlTemplate = (markdown: string) =>
  `
<!DOCTYPE html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js"></script>
    <script type="text/javascript">
      window.onload = function (){

        // options
        showdown.setFlavor('github');
        showdown.setOption('simplifiedAutoLink', true);
        showdown.setOption('strikethrough', true);
        showdown.setOption('tables', true);
        showdown.setOption('tasklists', true);
        showdown.setOption('requireSpaceBeforeHeadingText', true);
        showdown.setOption('openLinksInNewWindow', true);
        showdown.setOption('emoji', true);

        var converter = new showdown.Converter(),
        text = document.getElementById("markdown-source").textContent,
        html = converter.makeHtml(text);

        var body = document.getElementsByTagName("BODY")[0];
        body.innerHTML = html;  
      }
    </script>
    <pre id="markdown-source" style="display:none">${markdown}</pre>
</head>
<body>
</body>
</html>
`;

async function handleShowFile(
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    pipe.info(`Reading raw file ${path}`);
    const fileData = new TextDecoder("utf-8").decode(
      await Deno.readFile(path),
    );
    const isEncryptedFile = fileData.startsWith("VimCrypt");
    message.reply.body = htmlTemplate(
      isEncryptedFile
        ? "__Encrypted file__\n````\n" + fileData + "\n````"
        : fileData,
    );
    message.reply.returnCode = 200;
    return message;
  } catch (err) {
    pipe.info("Could not read file.");
    message.reply.body = "Not found";
    message.reply.returnCode = 404;
    return message;
  }
}

async function handleShowRawFile(
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    pipe.info(`Reading raw file ${path}`);
    const fileData = await Deno.readFile(path);
    message.reply.body = base64.fromUint8Array(fileData);
    message.reply.base64 = true;
    message.reply.returnCode = 200;
    return message;
  } catch (err) {
    pipe.info("Could not read file. (creating a new file)");
    message.reply.body = "This is a new file";
    message.reply.returnCode = 200;
    return message;
  }
}

async function handleUpdateFile(
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const fileData = base64.toUint8Array(message.request.payload!!);
    if (fileData.length > 0) {
      pipe.info(`Updating file ${path}`);
      Deno.writeFileSync(path, fileData, { mode: 0o0777 });
    } else {
      // deleting file
      pipe.info(`Removing file ${path}`);
      Deno.removeSync(path);
    }
    message.reply.returnCode = 204;
    message.reply.headers["Content-Location"] = path;
    return message;
  } catch (err) {
    pipe.error("Could not write file.", err);
    message.reply.body = "Internal Server Error";
    message.reply.returnCode = 500;
    return message;
  }
}

processPipeMessages<api_pipeserver_v0_3>(
  vimEditorHandler,
  "Started vim editor handler...",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
