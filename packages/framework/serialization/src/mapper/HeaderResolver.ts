export class HeaderResolver {
  public resolve(mediaType: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': mediaType,
    };
    // Future extensions:
    // TODO: Support Content-Length calculation
    // TODO: Support Cache-Control headers
    // TODO: Support ETag hashing
    // TODO: Support Location redirections
    return headers;
  }
}
