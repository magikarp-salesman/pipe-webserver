import { api_pipeserver } from "./api_v0_1.ts";

export interface PipeAPISkippableModules extends api_pipeserver {
  request: {
    includeModules?: Array<string>;
    skipModules?: Array<string>;
  };
}
