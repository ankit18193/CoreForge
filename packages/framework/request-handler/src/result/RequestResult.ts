export class RequestResult {
  public readonly statusCode: number;
  public readonly body: unknown;
  public readonly headers: Readonly<Record<string, string>>;

  constructor(statusCode: number, body: unknown, headers?: Record<string, string>) {
    this.statusCode = statusCode;
    this.body = body;
    this.headers = Object.freeze({ ...(headers || {}) });
    Object.freeze(this);
  }
}
