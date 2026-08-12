export class ResponseMetadata {
  public readonly contentLength: number;
  public readonly encoding: string;
  public readonly mediaType: string;
  public readonly generatedAt: number;

  constructor(params: { contentLength: number; encoding: string; mediaType: string }) {
    this.contentLength = params.contentLength;
    this.encoding = params.encoding;
    this.mediaType = params.mediaType;
    this.generatedAt = Date.now();
    Object.freeze(this);
  }
}
