// local dependencies

export {
  getCommandLineArgs,
  processPipeMessages,
  receiverProcessor,
} from "./common.ts";
export type { PipeFunctions } from "./common.ts";
export type { api_pipeserver, api_pipeserver_v0_1 } from "./api/api_v0_1.ts";
export type { api_pipeserver_v0_2 } from "./api/api_v0_2.ts";
export type { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
export type { api_pipeserver_v0_3_cache } from "./api/api_v0_3_cache.ts";

// external dependencies

export { serve } from "https://deno.land/std@0.97.0/http/server.ts";
export type {
  Response,
  Server,
  ServerRequest,
} from "https://deno.land/std@0.97.0/http/server.ts";
import { createHash } from "https://deno.land/std@0.103.0/hash/mod.ts";
import {
  decode,
  encode,
} from "https://deno.land/std@0.97.0/encoding/base64.ts";
export { parse } from "https://deno.land/std@0.97.0/flags/mod.ts";
export { ensureDirSync } from "https://deno.land/std@0.97.0/fs/mod.ts";
export { readLines } from "https://deno.land/std@0.97.0/io/bufio.ts";
export { minifyHTML } from "https://deno.land/x/minifier@v1.1.1/mod.ts";
import { v4 as uuid } from "https://deno.land/std@0.97.0/uuid/mod.ts";
export { firstBy } from "https://raw.githubusercontent.com/magikarp-salesman/thenBy.js/master/thenBy.deno.ts";

// util objects

export const base64 = {
  encode,
  decode,
  encodeUnicode: (str: string) =>
    btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
        String.fromCharCode(parseInt("0x" + p1))),
    ), // https://attacomsian.com/blog/javascript-base64-encode-decode
};

export const utils = {
  uuid,
  md5: (value: string) => createHash("md5").update(value).toString(),
  paddedLowercase: (size = 20, filler = " ") =>
    (value: string) =>
      value.toLowerCase().substr(0, size).padStart(
        size,
        filler,
      ),
};
