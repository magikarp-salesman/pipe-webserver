export interface PipeServerAPI {
  version: number;
  uuid: string;
}

export interface PipeServerAPIv01 extends PipeServerAPI {
  version: 0.1;

  request: {
    url: string;
    method: string;
  };

  reply: {
    body?: string;
  };
}

// vim: ts=2 sts=2 sw=2 tw=0 noet
