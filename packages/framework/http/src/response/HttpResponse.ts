import { HttpResponse as IHttpResponse } from '@coreforge/contracts';

import { ResponseCookie } from './ResponseCookie';

export class HttpResponse implements IHttpResponse {
  public readonly status: number;
  public readonly headers: Readonly<Record<string, unknown>>;
  public readonly cookies: Readonly<Record<string, ResponseCookie>>;
  public readonly body: unknown;
  public readonly contentType?: string | undefined;

  constructor(params: {
    status: number;
    headers?: Record<string, unknown> | undefined;
    cookies?: Record<string, ResponseCookie> | undefined;
    body?: unknown;
    contentType?: string | undefined;
  }) {
    this.status = params.status;
    this.headers = Object.freeze({ ...(params.headers || {}) });
    this.cookies = Object.freeze({ ...(params.cookies || {}) });
    this.body = params.body;
    this.contentType = params.contentType;
    Object.freeze(this);
  }
}
