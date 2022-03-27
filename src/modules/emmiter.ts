import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  server: `localhost`,
  port: 8000,
});

const emmitMessage = (
  message: PipeServerAPIv03,
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
    .then((_data) => {
      // console.log('Success:', data);
    })
    .catch((error) => {
      pipe.error("Could not emmit message", error);
    });
};

processPipeMessages<PipeServerAPIv03>(
  emmitMessage,
  "emmiter",
  "Initialized...",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
