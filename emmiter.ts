import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import { getCommandLineArgs, processPipeMessagesV2 } from "./common.ts";

const args = getCommandLineArgs({
  server: `localhost`,
  port: 8000,
});

const emmitMessage = async (message: api_pipeserver_v0_2) => {
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

processPipeMessagesV2(emmitMessage, "Initialized emitter...");

// vim: ts=2 sts=2 sw=2 tw=0 noet
