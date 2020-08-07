interface api_pipeserver {
    version: number,
    uuid: string,
}

interface api_pipeserver_v0_1 extends api_pipeserver {
    version: 0.1

    request: {
        url: string,
        method: string,
    }

    reply: {
        body?: string
    }
}
