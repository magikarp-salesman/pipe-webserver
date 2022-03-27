import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv01,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  filterUrl: "/api",
});

const filterMessages = (
  message: PipeServerAPIv01,
  pipe: PipeFunctions,
) => {
  // forward message only if url is allowed
  if (message.request.url.startsWith(args.filterUrl)) return message;

  pipe.debug(`Filtered message with url: ${message.request.url}`);
};

processPipeMessages<PipeServerAPIv01>(filterMessages, "filter");

// vim: ts=2 sts=2 sw=2 tw=0 noet
