import {
  base64,
  ensureDirSync,
  firstBy,
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  PipeServerAPIv03Cache,
  processPipeMessages,
  utils,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
  host: "http://localhost:8000",
});

type PipeServerAPICombo = PipeServerAPIv03 & PipeServerAPIv03Cache;

/*
  TODO:
  - Need a way to upload files/images easily (drop unto page for upload?)
  - Need a way to download files instead of including them
  - Download as zip ( separate pipeline function )
  - Go/update into zips
  - Include encrypted file
  - A cache system by passing the info to fill ETag value
*/

const vimEditorHandler = async (
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  // don't handle browser requests
  if (message.request.userAgent == "browser") return message;

  const url = new URL(args.host + message.request.url);
  const grepQuery = url.searchParams.get("grep");

  if (
    message.request.userAgent == "vim" && message.request.method === "get" &&
    grepQuery == undefined
  ) {
    // this is a request from vim, send the raw file
    return await handleShowRawFile(message, pipe);
  }

  if (
    message.request.userAgent == "vim" && message.request.method === "get" &&
    grepQuery != undefined
  ) {
    // this is a search request from vimgrep
    return handleSearchRequest(message, pipe, grepQuery);
  }

  if (message.request.userAgent == "vim" && message.request.method === "put") {
    // this is a update request from vim
    return handleUpdateFile(message, pipe);
  }

  // unknown case, show an error
  pipe.error(`Could not handle request: ${message.request.url}`);

  return message; // forward message
};

async function handleShowRawFile(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    pipe.info(`Reading raw file ${path}`);

    const stat = await Deno.lstat(path);

    if (stat.isDirectory) return handleShowRawDirectory(message, pipe, path);

    const fileData = await Deno.readFile(path);
    message.reply.body = base64.encode(fileData);
    message.reply.type = "base64";
    message.reply.returnCode = 200;
    return message;
  } catch (_err) {
    pipe.info("Could not read file. (creating a new file)");

    message.reply.body = `---
title: new markdown file
author: anonymous
created: ${new Date().toISOString()}
---

This is a new file
`;
    message.reply.returnCode = 200;
    return message;
  }
}

async function handleShowRawDirectory(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
  dir: string,
) {
  try {
    // create file listing
    const files = [];
    for await (const dirEntry of Deno.readDir(dir)) {
      files.push(dirEntry);
    }

    let maxLenght = 0;
    const fileLinks = files.map((entry) => {
      const isMarkdownFile = entry.isFile &&
        entry.name.toLowerCase().endsWith(".md");
      const isDirectory = entry.isDirectory;
      return {
        ...entry,
        isMarkdownFile: isMarkdownFile,
        isDirectory: isDirectory,
        filename: isDirectory ? entry.name + "/" : entry.name,
      };
    }).map((entry) => {
      maxLenght = entry.filename.length > maxLenght
        ? entry.filename.length
        : maxLenght;
      return entry;
    }).map((entry) => {
      const diff = maxLenght - entry.filename.length;
      const symbol = entry.isMarkdownFile
        ? "M"
        : entry.isDirectory
        ? "📁 dir"
        : "…";
      return {
        ...entry,
        filename: entry.filename + " ".repeat(diff + 5) + '" ' + symbol,
      };
    }).map((entry) => {
      return {
        ...entry,
        link: ":silent e! " + args.host + args.baseUrl +
          dir.substring(args.localFolder.length) + entry.filename,
      };
    }).sort(
      firstBy("isDirectory", "desc").thenBy("isMarkdownFile", "desc").thenBy(
        "filename",
      ),
    ).map((entry) => entry.link).join("\n");

    const result = utils.perLine(`\" Files in directory: ${dir}

  ${fileLinks}
  
  " search by grep
  :set grepprg=curl\\ --silent\\ --user-agent\\ vim\\ ${
      args.host +
      args.baseUrl
    }/?grep=$* | grep! | redraw! | copen

  " refresh this directory
  :e! %

  " helpful commands:
  :nnoremap <leader>el yy:@"<CR>      " execute the line under the cursor as a vim command
  :nnoremap <leader>ol yiW:!open <C-R>"<CR>
  "
  " vim: ft=vim ts=2 sts=2 sw=2 tw=0 noet
  `).trim().toString();

    pipe.info(`Reading raw directory listing`);
    message.reply.body = result;
    message.reply.type = undefined;
    message.reply.returnCode = 200;
    return message;
  } catch (err) {
    pipe.info("Could not read directory. (sending error): " + err);
    message.reply.returnCode = 404;
    return message;
  }
}

function handleUpdateFile(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const fileData = base64.decode(message.request.payload!);
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

async function handleSearchRequest(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
  query: string,
) {
  const url = message.request.url.split("?")[0];
  const relativePath = url.substring(args.baseUrl.length);
  const path = args.localFolder + relativePath;
  const directory = path;
  pipe.info(`Making search in directory ${path}`);

  query = (query != "") ? query : query = "^#\\ "; // search for files containing markdown headers

  const cmd = [
    "grep",
    "--ignore-case",
    "--binary-files=without-match",
    "--line-number",
    "--recursive",
    "--basic-regexp",
    "--include=*.md",
    "--exclude-dir=*.cache*",
    query,
    directory,
  ];
  pipe.debug("Running command: " + cmd);

  const job = Deno.run({
    cmd: cmd,
    stdout: "piped",
    stderr: "null",
  });

  const { code: _code } = await job.status();
  const rawOutput = await job.output();
  const output = new TextDecoder().decode(rawOutput);
  pipe.debug("Got the following results number:" + output.split("\n").length);
  pipe.debug(output);
  const remoteOutput = utils.perLine(output).trim().filterEmpty().map(
    (line) => args.host + "/" + url + "/" + line.substring(path.length),
  ).toString();

  pipe.info(`Returning grep command results`);
  message.reply.body = remoteOutput;
  message.reply.type = undefined;
  message.reply.returnCode = 200;
  return message;
}

processPipeMessages<PipeServerAPICombo>(
  vimEditorHandler,
  "vim-editor",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
