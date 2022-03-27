import { PipeServerAPI } from "./api_v0_1.ts";

export interface PipeServerAPIv02 extends PipeServerAPI {
  version: 0.2;

  request: {
    url: string;
    method: string;
    authorization?: string;
  };

  reply: {
    body?: string;
    base64: boolean;
    headers: any;
    returnCode?: number;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
