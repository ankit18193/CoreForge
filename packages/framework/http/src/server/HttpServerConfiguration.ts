import { HttpServerOptions } from './HttpServerOptions';

export class HttpServerConfiguration {
  public readonly host: string;
  public readonly port: number;
  public readonly httpsOptions?: Readonly<Record<string, unknown>> | undefined;
  public readonly requestLimit?: string | undefined;
  public readonly adapterToken?: unknown | undefined;

  constructor(options: HttpServerOptions) {
    this.host = options.host !== undefined ? options.host : 'localhost';
    this.port = options.port !== undefined ? options.port : 8080;
    this.httpsOptions = options.httpsOptions
      ? Object.freeze({ ...options.httpsOptions })
      : undefined;
    this.requestLimit = options.requestLimit;
    this.adapterToken = options.adapterToken;
    Object.freeze(this);
  }
}
