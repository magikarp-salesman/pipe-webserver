import { api_pipeserver } from "./api_v0_1.ts";

export interface api_pipeserver_v0_3_cache extends api_pipeserver {
  request: {
    cacheKeyMatch?: string;
  };

  reply: {
    cacheKey?: string;
  };
}
