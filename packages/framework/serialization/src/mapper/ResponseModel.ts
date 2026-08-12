export class ResponseModel {
  public readonly body: unknown;
  public readonly statusCode: number;
  public readonly headers: Readonly<Record<string, string>>;
  public readonly mediaType?: string | undefined;

  constructor(params: {
    body: unknown;
    statusCode: number;
    headers: Record<string, string>;
    mediaType?: string;
  }) {
    this.body = params.body;
    this.statusCode = params.statusCode;
    this.headers = Object.freeze({ ...params.headers });
    this.mediaType = params.mediaType;
    Object.freeze(this);
  }
}
