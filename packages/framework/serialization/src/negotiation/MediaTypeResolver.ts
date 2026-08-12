import { MediaType } from './MediaType';

export class MediaTypeResolver {
  public resolve(acceptHeader?: string, body?: unknown): string {
    if (!acceptHeader || acceptHeader === '*/*') {
      if (body instanceof Buffer || body instanceof Uint8Array) {
        return MediaType.BINARY;
      }
      if (typeof body === 'string') {
        return MediaType.TEXT;
      }
      return MediaType.JSON;
    }

    const types = acceptHeader.split(',').map((t) => t.trim().split(';')[0]);

    for (const t of types) {
      if (t === 'application/json') {
        return MediaType.JSON;
      }
      if (t === 'text/plain') {
        return MediaType.TEXT;
      }
      if (t === 'application/octet-stream') {
        return MediaType.BINARY;
      }

      if (t.startsWith('application/xml') || t.startsWith('text/xml')) {
        return 'application/xml';
      }
    }

    return MediaType.JSON;
  }
}
