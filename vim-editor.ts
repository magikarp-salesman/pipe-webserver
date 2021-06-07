import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import { ensureDirSync } from "https://deno.land/std@0.97.0/fs/mod.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
});

/*
  TODO:
  - Need a way to upload files/images easily (drop unto page for upload?)
  - Need a way to backup youtube videos and images .. a separate pipeline?
  - Need a way to download files instead of including them
  - Download as zip
  - Edit other files near them from inside vim
  - Go/update into zips
  - A way of searching for something in all the files (tags?)
*/

const vimEditorHandler = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  // don't handle any message that is not requesting a .md file starting on the baseURL
  if (
    !message.request.url.startsWith(args.baseUrl) ||
    !(message.request.url.endsWith(".md") || message.request.url.endsWith("/"))
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
    return handleUpdateFile(message, pipe);
  }

  // unknown case, show an error
  pipe.error(`Could not handle request: ${message.request.url}`);

  return message; // forward message
};

async function handleShowFile(
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const stat = await Deno.lstat(path);

    if (stat.isDirectory) return handleShowDirectory(message, pipe, path);

    pipe.info(`Reading raw file ${path}`);
    const fileData = new TextDecoder("utf-8").decode(
      await Deno.readFile(path),
    );
    const isEncryptedFile = fileData.startsWith("VimCrypt");
    const directory = path.substring(0, path.lastIndexOf("/")) + "/";
    message.reply.body = isEncryptedFile
      ? ":closed_lock_with_key: __Encrypted file__\n````\n" + fileData +
        "\n````"
      : postProcessIncludes(pipe, fileData, directory);
    message.reply.type = "markdown";
    message.reply.returnCode = 200;
    return message;
  } catch (err) {
    pipe.info("Could not read file.");
    message.reply.body = "Not found";
    message.reply.returnCode = 404;
    return message;
  }
}

async function handleShowDirectory(
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
  path: string,
) {
  // create file listing
  const toc = [];
  const includes = [];
  for await (const dirEntry of Deno.readDir(path)) {
    const icon = dirEntry.isFile ? ":clipboard:" : ":file_folder:";
    const link = dirEntry.isFile ? `./${dirEntry.name}` : `./${dirEntry.name}/`;
    const isMarkdownFile = dirEntry.isFile &&
      dirEntry.name.toLowerCase().endsWith(".md");
    toc.push(` - ${icon} [${dirEntry.name}](${link})`);
    if (isMarkdownFile) includes.push(dirEntry.name);
  }

  const includesFiles = includes.sort().map((file) => `{!./${file}!}`).join(
    "\n" + "\n",
  );
  const fileList = toc.sort().map((line) => `> ${line}`).join("\n");

  const markdownResult = `
${includesFiles}
- - -
${fileList}
`;

  message.reply.body = postProcessIncludes(pipe, markdownResult, path);
  message.reply.type = "markdown";
  message.reply.returnCode = 200;
  return message;
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
    message.reply.type = "base64";
    message.reply.returnCode = 200;
    return message;
  } catch (err) {
    pipe.info("Could not read file. (creating a new file)");

    message.reply.body = "This is a new file";
    message.reply.returnCode = 200;
    return message;
  }
}

function handleUpdateFile(
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const fileData = base64.toUint8Array(message.request.payload!!);
    if (fileData.length > 0) {
      pipe.info(`Updating file ${path}`);
      const directory = path.substring(0, path.lastIndexOf("/"));
      pipe.info(`File directory: '${directory}'`);
      ensureDirSync(directory);
      Deno.writeFileSync(path, fileData, { mode: 0o0777 });
    } else {
      // deleting file
      pipe.info(`Removing file ${path}`);
      Deno.removeSync(path);
    }
    message.reply.returnCode = 204;
    message.reply.headers["Content-Location"] = path;
    message.request.payload = undefined; // no need to forward the payload
    return message;
  } catch (err) {
    pipe.error("Could not write file.", err);
    message.reply.body = "Internal Server Error";
    message.reply.returnCode = 500;
    return message;
  }
}

function postProcessIncludes(
  pipe: PipeFunctions,
  markdown: string,
  basePath: string,
) {
  return markdown.split("\n").map((row) => {
    const rowTrim = row.trim().toLowerCase();
    if (rowTrim.startsWith("{!") && rowTrim.endsWith("!}")) {
      const fileName = basePath + rowTrim.substring(2, rowTrim.length - 2);
      try {
        const file = Deno.readFileSync(fileName);
        pipe.info(`Including file '${fileName}'`);
        return new TextDecoder("utf-8").decode(file);
      } catch (_e) {
        pipe.warn(`Could not include file! '${fileName}'`);
      }
    }
    return row;
  }).join("\n");
}

processPipeMessages<api_pipeserver_v0_3>(
  vimEditorHandler,
  "vim-editor",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
