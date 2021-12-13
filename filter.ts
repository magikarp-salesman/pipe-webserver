import {
  api_pipeserver_v0_1,
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./dependencies.ts";

const args = getCommandLineArgs({
  filterUrl: "/api",
});

const filterMessages = async (
  message: api_pipeserver,
  pipe: PipeFunctions,
) => {
  // forward message only if url is allowed
  if (message.request.url.startsWith(args.filterUrl)) return message;

  pipe.debug(`Filtered message with url: ${message.request.url}`);
};

processPipeMessages<api_pipeserver_v0_1>(filterMessages, "filter");

// vim: ts=2 sts=2 sw=2 tw=0 noet
