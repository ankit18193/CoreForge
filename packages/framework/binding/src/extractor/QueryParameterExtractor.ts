import { HttpRequest } from '@coreforge/contracts';

export class QueryParameterExtractor {
  public extract(request: HttpRequest, name: string): string | undefined {
    const query = (request.query || {}) as Record<string, unknown>;
    const val = query[name];
    return val !== undefined ? String(val) : undefined;
  }
}
