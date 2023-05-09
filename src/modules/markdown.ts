import {
  FileInfoMapped,
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

const markdownHandler = async (
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) => {
  // we already have a return code so just forward the message
  if (message.reply.returnCode) return message;

  const requestPath = message.request.url.split("?")[0];

  if (message.reply.body !== undefined && message.reply.type === "markdown") {
    // we already have the markdown payload to convert
    const info = await utils.urlMapped(
      args.baseUrl + "/",
      args.localFolder + "/",
      message.request.fullUrl,
    );
    return handleShowPayload(message, info, pipe);
  }

  // don't handle any message that is not requesting a .md file starting on the baseURL
  if (!(requestPath.startsWith(args.baseUrl) && requestPath.endsWith(".md"))) {
    return message; // forward the message
  }

  // don't handle any requests that are not a head or get request
  if (!(message.request.method == "head" || message.request.method == "get")) {
    return message; // forward the message
  }

  // don't handle any requests not sent by a browser
  if (message.request.userAgent != "browser") {
    return message; // forward the message
  }

  if (message.request.method == "head") {
    // this is the browser asking for updates
    return await handleHeadRequest(message, pipe);
  }

  if (requestPath.endsWith("/index.md")) {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const directoryPath = path.slice(0, -8); // remove index.md
    return await handleShowDirectory(message, pipe, directoryPath);
  }

  return handleShowFile(message, pipe);
};

async function handleHeadRequest(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) {
  // TODO improve code
  // TODO add the method also for /index.md listings
  // TODO create the reload code
  try {
    const path = args.localFolder +
      message.request.url.substring(args.baseUrl.length);
    const stat = await Deno.lstat(path);
    message.reply.cacheKey = stat.mtime?.toString() || "";
    message.reply.returnCode = 200;
    return message;
  } catch (_err) {
    pipe.info("Could not read file.");
    message.reply.body = "Not found";
    message.reply.returnCode = 404;
    return message;
  }
}

function handleShowPayload(
  message: PipeServerAPICombo,
  info: FileInfoMapped,
  pipe: PipeFunctions,
) {
  pipe.info(`Reading from payload...`);
  const fileData = message.reply.body!;

  // improve this to run X times until we have no more references
  // instead of running twice

  const isEncryptedFile = fileData.startsWith("VimCrypt");
  message.reply.body = isEncryptedFile
    ? ":closed_lock_with_key: __Encrypted file__\n````\n" + fileData +
      "\n````"
    : postProcessIncludes(
      pipe,
      postProcessIncludes(
        pipe,
        fileData,
        info.local_directory,
        info.full_url_without_file,
      ),
      info.local_directory,
      info.full_url_without_file,
    );
  message.reply.cacheKey = utils.md5(message.reply.body!);
  message.reply.returnCode = 200;
  return message;
}

function handleShowFile(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) {
  try {
    const file = message.request.url.substring(args.baseUrl.length);
    const path = args.localFolder + file;
    const indexOfFile = message.request.fullUrl.indexOf(file);
    const fullUrlWithoutFile = message.request.fullUrl.slice(
      0,
      indexOfFile + 1,
    );
    const stat = Deno.lstatSync(path);

    pipe.info(`Reading raw file ${path}`);
    const fileData = new TextDecoder("utf-8").decode(Deno.readFileSync(path));
    const isEncryptedFile = fileData.startsWith("VimCrypt");
    const directory = path.substring(0, path.lastIndexOf("/")) + "/";
    message.reply.body = isEncryptedFile
      ? ":closed_lock_with_key: __Encrypted file__\n````\n" + fileData +
        "\n````"
      : postProcessIncludes(pipe, fileData, directory, fullUrlWithoutFile);
    message.reply.type = "markdown";
    message.reply.cacheKey = stat.mtime?.toString() || "";
    message.reply.returnCode = 200;
    return message;
  } catch (_err) {
    pipe.info("Could not read file.");
    message.reply.body = "Not found";
    message.reply.returnCode = 404;
    return message;
  }
}

async function handleShowDirectory(
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
  path: string,
) {
  // create file listing
  const toc = [];
  const includes = [];
  for await (const dirEntry of Deno.readDir(path)) {
    const icon = dirEntry.isFile ? ":clipboard:" : ":file_folder:";
    const link = dirEntry.isFile
      ? `./${dirEntry.name}`
      : `./${dirEntry.name}/index.md`;
    const isMarkdownFile = dirEntry.isFile &&
      dirEntry.name.toLowerCase().endsWith(".md");
    toc.push(` - ${icon} [${dirEntry.name}](${link})`);
    if (isMarkdownFile) includes.push(dirEntry.name);
  }
  const stat = await Deno.lstat(path);

  const markdownResult = toc.sort().map((line) => `> ${line}`).join("\n");

  message.reply.cacheKey = stat.mtime?.toString() || "";
  message.reply.body = postProcessIncludes(
    pipe,
    markdownResult,
    path,
    message.request.fullUrl,
  );
  message.reply.type = "markdown";
  message.reply.returnCode = 200;
  return message;
}

function postProcessIncludes(
  pipe: PipeFunctions,
  markdown: string,
  basePath: string,
  urlPathWithoutFile: string,
): string {
  return utils.perLine(markdown).map((row) => {
    const rowTrim = row.trim().toLowerCase();
    if (rowTrim.startsWith("{!") && rowTrim.endsWith("!}")) {
      const dataFromInclude = rowTrim.substring(2, rowTrim.length - 2);
      const isCodeInclude = dataFromInclude.indexOf("!code!") > 0;
      if (isCodeInclude) {
        // this is a special reference to an included file as a code target
        const values = dataFromInclude.split("!");
        const fileBasePath = values[0];
        const fileName = basePath + fileBasePath;
        const language = values[2];
        try {
          const file = Deno.readFileSync(fileName);
          pipe.info(`Including code file '${fileName}' for ${language}`);
          const fileData = new TextDecoder("utf-8").decode(file);
          return `<a href="${urlPathWithoutFile}${fileBasePath}" type="vim">${fileBasePath}</a>\n\`\`\`${language}\n${fileData}\n\`\`\``;
        } catch (_e) {
          pipe.warn(`Could not include file! '${fileName}'`);
        }
      } else {
        const fileName = basePath + dataFromInclude;
        try {
          const file = Deno.readFileSync(fileName);
          pipe.info(`Including file '${fileName}'`);
          const data = new TextDecoder("utf-8").decode(file);
          // remove metadata
          const filtered = data.replace(/(^---)([\S\s]*?)(^---)/m, "");

          return filtered;
        } catch (_e) {
          pipe.warn(`Could not include file! '${fileName}'`);
        }
      }
    }
    return row;
  }).toString();
}

processPipeMessages<PipeServerAPICombo>(
  markdownHandler,
  "markdown",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
