import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

const args = getCommandLineArgs({
  filterUrl: "/api",
});

const filterMessages = async (
  message: api_pipeserver_v0_1,
  pipe: PipeFunctions,
) => {
  // forward message only if url is allowed
  if (message.request.url.startsWith(args.filterUrl)) return message;

  pipe.debug(`Filtered message with url: ${message.request.url}`);
};

processPipeMessages<api_pipeserver_v0_1>(filterMessages, "filter");

// vim: ts=2 sts=2 sw=2 tw=0 noet
