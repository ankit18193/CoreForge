import { HttpRequest } from '@coreforge/contracts';

export class BodyExtractor {
  public extract(request: HttpRequest, name?: string | undefined): unknown {
    const body = request.body;
    if (name === undefined || name === '') {
      return body;
    }
    if (body && typeof body === 'object') {
      const bodyRecord = body as Record<string, unknown>;
      return bodyRecord[name];
    }
    return undefined;
  }
}
