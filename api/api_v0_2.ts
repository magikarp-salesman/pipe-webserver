import { api_pipeserver } from "./api_v0_1.ts";

export interface api_pipeserver_v0_2 extends api_pipeserver {
    version: 0.2

    request: {
        url: string,
        method: string,
    }

    reply: {
        body?: string
	    returnCode?: number
    }
}
