import { api_pipeserver } from "./api_v0_1.ts";

export interface api_pipeserver_v0_3 extends api_pipeserver {
  version: 0.3;

  request: {
    url: string;
    method: string;
    authorization?: string;
    userAgent: "curl" | "wget" | "other";
    ip?: string;
    payload?: string;
  };

  reply: {
    body?: string;
    headers: any;
    type?: "html" | "markdown" | "base64";
    returnCode?: number;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
