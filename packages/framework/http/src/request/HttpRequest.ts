import { HttpRequest as IHttpRequest } from '@coreforge/contracts';

export class HttpRequest implements IHttpRequest {
  public readonly method: string;
  public readonly url: string;
  public readonly path: string;
  public readonly query: Readonly<Record<string, unknown>>;
  public readonly headers: Readonly<Record<string, unknown>>;
  public readonly cookies: Readonly<Record<string, unknown>>;
  public readonly body: unknown;
  public readonly parameters: Readonly<Record<string, unknown>>;
  public readonly remoteAddress: string;
  public readonly protocol: string;
  public readonly requestId: string;

  constructor(params: {
    method: string;
    url: string;
    path: string;
    query?: Record<string, unknown> | undefined;
    headers?: Record<string, unknown> | undefined;
    cookies?: Record<string, unknown> | undefined;
    body?: unknown;
    parameters?: Record<string, unknown> | undefined;
    remoteAddress: string;
    protocol: string;
    requestId: string;
  }) {
    this.method = params.method;
    this.url = params.url;
    this.path = params.path;
    this.query = this.deepFreeze({ ...(params.query || {}) });
    this.headers = this.deepFreeze({ ...(params.headers || {}) });
    this.cookies = this.deepFreeze({ ...(params.cookies || {}) });
    this.body = params.body;
    this.parameters = this.deepFreeze({ ...(params.parameters || {}) });
    this.remoteAddress = params.remoteAddress;
    this.protocol = params.protocol;
    this.requestId = params.requestId;
    Object.freeze(this);
  }

  private deepFreeze<T>(obj: T): T {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const propVal = (obj as Record<string, unknown>)[prop];
        if (
          propVal !== null &&
          (typeof propVal === 'object' || typeof propVal === 'function') &&
          !Object.isFrozen(propVal)
        ) {
          this.deepFreeze(propVal);
        }
      });
    }
    return obj;
  }
}
