import { HttpRequest } from '@coreforge/contracts';

export class CookieExtractor {
  public extract(request: HttpRequest, name: string): string | undefined {
    const cookies = (request.cookies || {}) as Record<string, unknown>;
    const val = cookies[name];
    return val !== undefined ? String(val) : undefined;
  }
}
