import type { Server } from "node:http";

export interface ServerOptions {
  /** 레이트 리밋 창 크기(ms). 기본 60000. */
  windowMs?: number;
  /** 창당 허용 요청 수. 기본 120. */
  max?: number;
}

export interface ServeOptions extends ServerOptions {
  /** 기본 process.env.PORT 또는 3000. */
  port?: number;
  host?: string;
}

/** 원본 no-as-a-service 호환 HTTP 서버를 만든다. (listen 은 직접) */
export declare function createServer(options?: ServerOptions): Server;

/** 서버를 만들고 listen 까지 마친 뒤 돌려준다. */
export declare function serve(options?: ServeOptions): Promise<Server>;

export default createServer;
