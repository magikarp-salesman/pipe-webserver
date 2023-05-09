import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
  utils,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  basePath: "/docs/",
  baseFolder: "./docs/",
});

type PipeServerAPICombo = PipeServerAPIv03;

// TODO - create book css template with huge headings and proper page numeration

const bookHandler = async (
  message: PipeServerAPICombo,
  pipe: PipeFunctions,
) => {
  if (message.reply.returnCode) return message;
  if (message.request.method !== "get") return message;

  const info = await utils.urlMapped(
    args.basePath,
    args.baseFolder,
    message.request.fullUrl,
  );

  if (!info.starts_in_base_path) return message;
  if (info.filename != "book.md") return message;
  if (info.exists) return message;

  pipe.debug("Compiling book.md");

  const compiled = await compileFiles(info.local_directory, pipe);
  message.reply.body =
    `---\ntitle: ${info.partial_url}\ntemplate: book\n---\n\n` +
    compiled;
  message.reply.type = "markdown";
  return message;
};

async function compileFiles(
  mapped_path: string,
  pipe: PipeFunctions,
): Promise<string> {
  const files: Map<string, string> = new Map<string, string>();
  for await (const entry of Deno.readDir(mapped_path)) {
    if (entry.isFile && entry.name.toLowerCase().endsWith(".md")) {
      files.set(entry.name, `{!${entry.name}!}`);
    }

    if (entry.isSymlink) {
      pipe.debug("Ignoring symlink " + entry.name);
    }
  }

  const compiledFiles = [...files].sort().map(([_, value]) => value).join(
    `\n\n<p style="height: 0px;margin: 0px;page-break-after: always;">&nbsp;</p><p style="height: 0px;margin: 0px;page-break-before: always;">&nbsp;</p>\n\n`,
  );

  return compiledFiles;
}

processPipeMessages<PipeServerAPICombo>(
  bookHandler,
  "book",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
