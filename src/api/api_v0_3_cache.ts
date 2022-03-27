import { PipeServerAPI } from "./api_v0_1.ts";

export interface PipeServerAPIv03Cache extends PipeServerAPI {
  request: {
    cacheKeyMatch?: string;
  };

  reply: {
    cacheKey?: string;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
