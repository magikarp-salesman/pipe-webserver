import { api_pipeserver } from "./api_v0_1.ts";

export interface api_pipeserver_v0_2 extends api_pipeserver {
  version: 0.2;

  request: {
    url: string;
    method: string;
    authorization?: string;
  };

  reply: {
    body?: string;
    headers: any;
    returnCode?: number;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
