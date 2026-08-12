import { Container } from '@coreforge/container';

import { HttpServer } from './HttpServer';
import { HttpServerConfiguration } from './HttpServerConfiguration';
import { HttpServerOptions } from './HttpServerOptions';

export class HttpServerBuilder {
  private readonly _options: HttpServerOptions = {};
  private _container?: Container | undefined;

  constructor(container?: Container | undefined) {
    this._container = container;
  }

  public useAdapter(adapterToken: unknown): this {
    this._options.adapterToken = adapterToken;
    return this;
  }

  public configureHost(host: string): this {
    this._options.host = host;
    return this;
  }

  public configurePort(port: number): this {
    this._options.port = port;
    return this;
  }

  public configureHttps(options: Record<string, unknown>): this {
    this._options.httpsOptions = options;
    return this;
  }

  public configureRequestLimit(limit: string): this {
    this._options.requestLimit = limit;
    return this;
  }

  public setContainer(container: Container): this {
    this._container = container;
    return this;
  }

  public build(): HttpServer {
    const configuration = new HttpServerConfiguration(this._options);
    const container = this._container || new Container();
    return new HttpServer(configuration, container);
  }
}
