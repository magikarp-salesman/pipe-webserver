import { readLines } from "https://deno.land/std@0.62.0/io/bufio.ts"
import { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
import { getCommandLineArgs, sendPipeError, sendPipeDebug } from "./common.ts"

const args = getCommandLineArgs({
	server: `localhost`,
	port: 8000
});

async function main() {
	for await (const line of readLines(Deno.stdin)) {
		try {
			var request:api_pipeserver_v0_2 = JSON.parse(line);

			fetch(`http://${args.server}:${args.port}/reply`, {
			  method: 'POST', // or 'PUT'
			  headers: {
			    'Content-Type': 'application/json',
			  },
			  body: JSON.stringify(request),
			})
			.then(response => response.json())
			.then(data => {
			  // console.log('Success:', data);
			})
			.catch((error) => {
			  // console.error('Error:', error, request);
			});
		} catch(err){
            sendPipeError("Could not parse NDJSON");
            sendPipeError(line);
		}
	}
}

sendPipeDebug("Initialized emitter...");
main();