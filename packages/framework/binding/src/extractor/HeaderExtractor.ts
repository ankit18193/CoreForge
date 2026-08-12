import { HttpRequest } from '@coreforge/contracts';

export class HeaderExtractor {
  public extract(request: HttpRequest, name: string): string | undefined {
    const headers = (request.headers || {}) as Record<string, unknown>;
    const val = headers[name.toLowerCase()] || headers[name];
    return val !== undefined ? String(val) : undefined;
  }
}
