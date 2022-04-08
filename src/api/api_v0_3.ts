import { PipeServerAPI } from "./api_v0_1.ts";

export interface PipeServerAPIv03 extends PipeServerAPI {
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
    // deno-lint-ignore no-explicit-any
    headers: any;
    type?: "html" | "markdown" | "base64";
    returnCode?: number;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
