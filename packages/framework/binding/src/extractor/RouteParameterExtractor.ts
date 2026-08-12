import { HttpRequest } from '@coreforge/contracts';

export class RouteParameterExtractor {
  public extract(request: HttpRequest, name: string): string | undefined {
    const params = (request.parameters || {}) as Record<string, unknown>;
    const val = params[name];
    return val !== undefined ? String(val) : undefined;
  }
}
