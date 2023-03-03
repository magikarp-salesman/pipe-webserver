import { PipeServerAPI } from "./api_v0_1.ts";

export interface PipeServerAPISkippableModules extends PipeServerAPI {
  request: {
    includeModules?: Array<string>; // TODO: modules skipped by default
    skipModules?: Array<string>;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
