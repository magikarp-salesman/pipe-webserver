import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessagesV1,
} from "./common.ts";

const args = getCommandLineArgs({
  filterUrl: "/api",
});

const filterMessages = async (
  message: api_pipeserver_v0_1,
  pipe: PipeFunctions,
) => {
  if (message.request.url === args.filterUrl) {
    // forward message only if url is allowed
    return message;
  } else {
    pipe.debug(`Filtered message with url: ${message.request.url}`);
  }
};

processPipeMessagesV1(filterMessages, "Started filter...");

// vim: ts=2 sts=2 sw=2 tw=0 noet
