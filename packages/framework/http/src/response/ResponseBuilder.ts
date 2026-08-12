import { HttpResponse } from './HttpResponse';
import { ResponseCookie } from './ResponseCookie';

export class ResponseBuilder {
  private _status = 200;
  private readonly _headers: Record<string, unknown> = {};
  private readonly _cookies: Record<string, ResponseCookie> = {};
  private _body: unknown = null;
  private _contentType?: string | undefined;

  public status(status: number): this {
    this._status = status;
    return this;
  }

  public header(name: string, value: unknown): this {
    this._headers[name.toLowerCase()] = value;
    return this;
  }

  public cookie(cookie: ResponseCookie): this {
    this._cookies[cookie.name] = cookie;
    return this;
  }

  public body(body: unknown): this {
    this._body = body;
    return this;
  }

  public contentType(contentType: string): this {
    this._contentType = contentType;
    this._headers['content-type'] = contentType;
    return this;
  }

  public build(): HttpResponse {
    return new HttpResponse({
      status: this._status,
      headers: this._headers,
      cookies: this._cookies,
      body: this._body,
      contentType: this._contentType,
    });
  }
}
