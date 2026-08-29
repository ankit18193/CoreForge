import { NormalizedRequest } from '@coreforge/contracts';

export class DefaultTransportRequestNormalizer {
  public normalize(rawRequest: unknown): NormalizedRequest {
    if (!rawRequest || typeof rawRequest !== 'object') {
      return Object.freeze({
        method: 'GET',
        path: '/',
        headers: Object.freeze({}),
        query: Object.freeze({}),
        params: Object.freeze({}),
        cookies: Object.freeze({}),
      });
    }

    const req = rawRequest as Record<string, unknown>;
    const method = typeof req.method === 'string' ? req.method.toUpperCase() : 'GET';
    const path =
      typeof req.url === 'string'
        ? req.url.split('?')[0]
        : typeof req.path === 'string'
          ? req.path
          : '/';

    const rawHeaders = (
      req.headers && typeof req.headers === 'object' ? req.headers : {}
    ) as Record<string, unknown>;
    const headers: Record<string, string | readonly string[]> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (typeof v === 'string' || Array.isArray(v)) {
        headers[k.toLowerCase()] = v as string | readonly string[];
      }
    }

    const query = (req.query && typeof req.query === 'object' ? { ...req.query } : {}) as Record<
      string,
      unknown
    >;
    const params = (
      req.params && typeof req.params === 'object' ? { ...req.params } : {}
    ) as Record<string, unknown>;
    const cookies = (
      req.cookies && typeof req.cookies === 'object' ? { ...req.cookies } : {}
    ) as Record<string, string | undefined>;

    return Object.freeze({
      method,
      path,
      headers: Object.freeze(headers),
      query: Object.freeze(query),
      params: Object.freeze(params),
      cookies: Object.freeze(cookies),
      body: req.body,
    });
  }
}
