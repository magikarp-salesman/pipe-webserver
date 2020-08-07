import { serve, ServerRequest } from "https://deno.land/std@0.62.0/http/server.ts"
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
import { getCommandLineArgs, sendPipeMessage, sendPipeError, sendPipeDebug } from "./common.ts"

const args = getCommandLineArgs({
	port: 8000
});

const server = serve({ port: args.port });
const requests: Map<string, ServerRequest> = new Map();

sendPipeDebug(`Starting receiver on port: ${args.port}`);

async function main() {	
	for await (const req of server) {
		if(!handleReply(req)){
			sendPipeDebug(`Received request`);
			let ndjson: api_pipeserver_v0_1 = {
				version: 0.1,
				uuid: v4.generate(),
				request: {
					url: req.url,
					method: req.method.toLowerCase(),
				},
				reply: {}
			}
			requests.set(ndjson.uuid,req);
			sendPipeMessage(ndjson);
		}
	}
}

async function readReply(req:ServerRequest): Promise<api_pipeserver_v0_1> {
	const buf = await Deno.readAll(req.body);
	const body = new TextDecoder("utf-8").decode(buf);
	return JSON.parse(body);;
}

function handleReply(req:ServerRequest){
	if(req.url === `/reply` && req.method === `POST`){
		readReply(req).then((msg: api_pipeserver_v0_1) => {
			sendPipeDebug(`Sending reply...`);
			const reqObject: ServerRequest | undefined = requests.get(msg.uuid)!!;
			if(reqObject !== undefined) {
				reqObject.respond({ body: msg.reply.body!! });
				requests.delete(msg.uuid);
			} else {
				req.respond({status:404});
			}
			return true;
		}).catch((err) => {
			sendPipeError(`Error sending reply... ${err}`);
		})
		return true;
	}
	return false;	
}

main();