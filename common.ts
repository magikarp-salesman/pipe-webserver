import { parse } from "https://deno.land/std/flags/mod.ts";
import { api_pipeserver } from "./api/api_v0_1.ts";

export function getCommandLineArgs(defaults: object){

    return {
        ...defaults,
        ...parse(Deno.args)
    }

}

export function sendPipeMessage(message: api_pipeserver){
    console.log(JSON.stringify(message));
}

export async function sendPipeDebug(message: string){
    const finalMessage:string = `[ps] [debug] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}

export async function sendPipeError(message: string){
    const finalMessage:string = `[ps] [error] ${message}\n`;
    await Deno.stderr.write(new TextEncoder().encode(finalMessage));
}
