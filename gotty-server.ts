import {
  api_pipeserver_v0_3,
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./dependencies.ts";

const args = getCommandLineArgs({
  url: "/gotty",
  executable: "gotty",
  gottyAddress: "0.0.0.0",
  gottyPort: 9000,
  gottyOptions: ["--permit-write", "--address", "0.0.0.0", "--port", "9000"],
  gottyCommand: "sh",
});

const gottyServer = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // forward message only if url does not start with the base url
  if (!message.request.url.startsWith(args.url)) return message;

  // forward message if it is already resolved
  if (message.reply.returnCode !== undefined) return message;

  startGottyServer(pipe);

  // redirect to the gotty port
  message.reply.returnCode = 200;
  message.reply.body = `<!DOCTYPE html>
<html>
<body>
<script>

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function redirect() {
    await sleep(1500);
    const redirect = window.location.protocol + "//" + window.location.hostname + ":${args.gottyPort}" + "/";
    window.location.replace(redirect);    
}

redirect();

</script>

</body>
</html>`;
  message.reply.type = "html";

  return message;
};

async function startGottyServer(pipe: PipeFunctions) {
  pipe.info("Starting GoTTY Server");
  const cmd = [args.executable].concat(
    args.gottyOptions,
    args.gottyCommand.split(" "),
  );
  const job = Deno.run({
    cmd: cmd,
    stdout: "null",
    stderr: "piped",
  });
  await waitForCompletion(pipe, job);
}

async function waitForCompletion(pipe: PipeFunctions, job: any) {
  const status = await job.status();
  if (status.code != 0) {
    const rawError = await job.stderrOutput();
    const errorString = new TextDecoder().decode(rawError);
    pipe.error("Error while starting gotty server: " + status.code);
    errorString.split("\n").forEach((message) => {
      pipe.error(message);
    });
  }
}

processPipeMessages<api_pipeserver_v0_3>(gottyServer, "gotty-server");

// vim: ts=2 sts=2 sw=2 tw=0 noet
