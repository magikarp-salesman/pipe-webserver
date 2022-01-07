import {
  api_pipeserver_v0_3,
  api_pipeserver_v0_3_cache,
  base64,
  ensureDirSync,
  firstBy,
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./dependencies.ts";

const args = getCommandLineArgs({
  baseUrl: "/docs",
  localFolder: "./docs",
  host: "http://localhost:8000",
});

type api_pipe_server_combo = api_pipeserver_v0_3 & api_pipeserver_v0_3_cache;

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
  message: api_pipe_server_combo,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  const url = new URL(args.host + message.request.url);
  const grepQuery = url.searchParams.get("grep");
  const requestPath = message.request.url.split("?")[0];

  // don't handle any message that is not requesting a .md file starting on the baseURL
  if (
    !requestPath.startsWith(args.baseUrl) ||
    !(requestPath.endsWith(".md") || requestPath.endsWith("/") ||
      grepQuery != undefined)
  ) {
    return message; // forward the message
  }

  if (message.request.method == "head") {
    // this is the browser asking for updates
    return await handleHeadRequest(message, pipe);
  }

  if (message.request.userAgent == "other") {
    // just show the html page if present
    return await handleShowFile(message, pipe);
  }

  if (message.request.userAgent == "wget") {
    // this is a request from vim, send the raw file
    return await handleShowRawFile(message, pipe);
  }

  if (
    message.request.userAgent == "curl" && message.request.method === "get" &&
    grepQuery != undefined
  ) {
    // this is a search request from vimgrep
    return handleSearchRequest(message, pipe, grepQuery);
  }

  if (message.request.userAgent == "curl" && message.request.method === "put") {
    // this is a update request from vim
    return handleUpdateFile(message, pipe);
  }

  // unknown case, show an error
  pipe.error(`Could not handle request: ${message.request.url}`);

  return message; // forward message
};

async function handleHeadRequest(
  message: api_pipe_server_combo,
  pipe: PipeFunctions,
) {
  // TODO improve code
  // TODO add the method also for directory listings
  // TODO create the reload code
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const stat = await Deno.lstat(path);
    message.reply.cacheKey = stat.mtime?.toString() || "";
    message.reply.returnCode = 200;
    return message;
  } catch (err) {
    pipe.info("Could not read file.");
    message.reply.body = "Not found";
    message.reply.returnCode = 404;
    return message;
  }
}

async function handleShowFile(
  message: api_pipe_server_combo,
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
    message.reply.cacheKey = stat.mtime?.toString() || "";
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
  message: api_pipe_server_combo,
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
  const stat = await Deno.lstat(path);

  const includesFiles = includes.sort().map((file) => `{!./${file}!}`).join(
    "\n" + "\n",
  );
  const fileList = toc.sort().map((line) => `> ${line}`).join("\n");

  const markdownResult = `
${includesFiles}
- - -
${fileList}
`;

  message.reply.cacheKey = stat.mtime?.toString() || "";
  message.reply.body = postProcessIncludes(pipe, markdownResult, path);
  message.reply.type = "markdown";
  message.reply.returnCode = 200;
  return message;
}

async function handleShowRawFile(
  message: api_pipe_server_combo,
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
  } catch (err) {
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
  message: api_pipe_server_combo,
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

    const trimAllLines = (text: string) =>
      text.split("\n").map((l) => l.trim()).join("\n");
    const result = trimAllLines(`\" Files in directory: ${dir}

  ${fileLinks}
  
  " search by grep
  :set grepprg=curl\\ --silent\\ ${
      args.host +
      args.baseUrl
    }/?grep=$* | grep! | redraw! | copen

  " helpful commands:
  " :nnoremap <leader>el yy:@"<CR>
  " :nnoremap <leader>ol yiW:!open <C-R>"<CR>
  "
  " vim: ft=vim ts=2 sts=2 sw=2 tw=0 noet
  `);

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
  message: api_pipe_server_combo,
  pipe: PipeFunctions,
) {
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const fileData = base64.decode(message.request.payload!!);
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
  message: api_pipe_server_combo,
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

  const { code } = await job.status();
  const rawOutput = await job.output();
  const output = new TextDecoder().decode(rawOutput);
  pipe.debug("Got the following results number:" + output.split("\n").length);
  const remoteOutput = output.split("\n")
    .map((line) => line.trim())
    .filter((line) => line != "")
    .map((line) =>
      args.host + args.baseUrl + "/" + relativePath + "/" +
      line.substring(directory.length)
    )
    .join("\n");

  pipe.info(`Returning grep command results`);
  message.reply.body = remoteOutput;
  message.reply.type = undefined;
  message.reply.returnCode = 200;
  return message;
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

processPipeMessages<api_pipe_server_combo>(
  vimEditorHandler,
  "vim-editor",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
