// local dependencies

export {
  getCommandLineArgs,
  processPipeMessages,
  receiverProcessor,
} from "./common.ts";
export type { PipeFunctions } from "./common.ts";
export type { PipeServerAPI, PipeServerAPIv01 } from "./api/api_v0_1.ts";
export type { PipeServerAPIv02 } from "./api/api_v0_2.ts";
export type { PipeServerAPIv03 } from "./api/api_v0_3.ts";
export type { PipeServerAPIv03Cache } from "./api/api_v0_3_cache.ts";

// external dependencies

export { serve } from "https://deno.land/std@0.130.0/http/mod.ts";
export type {
  ConnInfo,
  Server,
} from "https://deno.land/std@0.130.0/http/mod.ts";
import {
  decode,
  encode,
} from "https://deno.land/std@0.130.0/encoding/base64.ts";
export { parse } from "https://deno.land/std@0.130.0/flags/mod.ts";
export { ensureDirSync } from "https://deno.land/std@0.128.0/fs/mod.ts";
export { readLines } from "https://deno.land/std@0.130.0/io/buffer.ts";
export { minifyHTML } from "https://deno.land/x/minifier@v1.1.1/mod.ts";
import { v4 as uuid } from "https://deno.land/std@0.130.0/uuid/mod.ts";
export { firstBy } from "https://raw.githubusercontent.com/magikarp-salesman/thenBy.js/master/thenBy.deno.ts";
export { urlParse } from "https://deno.land/x/url_parse@1.1.0/mod.ts";
import {
  readAll,
  readerFromStreamReader,
} from "https://deno.land/std@0.130.0/streams/conversion.ts";
import { createHash } from "https://deno.land/std@0.130.0/hash/mod.ts";

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
  md5: (value: string) => {
    const hash = createHash("md5");
    hash.update(value);
    return hash.toString();
  },
  paddedLowercase: (size = 20, filler = " ") =>
    (value: string) =>
      value.toLowerCase().substr(0, size).padStart(
        size,
        filler,
      ),
  readableStreamToUint8Array: (
    stream: ReadableStream<Uint8Array> | null,
  ): Promise<Uint8Array> => {
    if (!stream) return Promise.resolve(new Uint8Array([]));
    const readableStreamDefaultReader = stream.getReader();
    const readerFromStreamReaderObj = readerFromStreamReader(
      readableStreamDefaultReader,
    );
    return readAll(readerFromStreamReaderObj);
  },
  Uint8ArrayToString: async (array: Promise<Uint8Array>): Promise<string> =>
    new TextDecoder("utf-8").decode(await array),
};
