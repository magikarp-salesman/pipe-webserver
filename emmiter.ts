import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

const args = getCommandLineArgs({
  server: `localhost`,
  port: 8000,
});

const emmitMessage = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  fetch(`http://${args.server}:${args.port}/reply`, {
    method: "POST", // or 'PUT'
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  })
    .then((response) => response.json())
    .then((data) => {
      // console.log('Success:', data);
    })
    .catch((error) => {
      pipe.error("Could not emmit message", error);
    });
};

processPipeMessages<api_pipeserver_v0_3>(
  emmitMessage,
  "emmiter",
  "Initialized...",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
