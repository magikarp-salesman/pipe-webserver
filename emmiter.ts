import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import { getCommandLineArgs, processPipeMessages } from "./common.ts";

const args = getCommandLineArgs({
  server: `localhost`,
  port: 8000,
});

const emmitMessage = async (message: api_pipeserver_v0_3) => {
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
      // console.error('Error:', error, request);
    });
};

processPipeMessages<api_pipeserver_v0_3>(
  emmitMessage,
  "Initialized emitter...",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
