import { TransportNormalizationError } from '../errors/TransportErrors';
import { NormalizedRequest, TransportRequestNormalizer } from '../types/transportTypes';

export class DefaultTransportRequestNormalizer implements TransportRequestNormalizer {
  public normalize(request: unknown): NormalizedRequest {
    if (typeof request !== 'object' || request === null) {
      throw new TransportNormalizationError('Invalid request: request must be a non-null object.');
    }

    try {
      const raw = request as Record<string, unknown>;

      // 1. Method normalization
      const rawMethod = typeof raw.method === 'string' ? raw.method : 'GET';
      const method = rawMethod.toUpperCase();

      // 2. Path normalization
      let path =
        typeof raw.path === 'string' ? raw.path : typeof raw.url === 'string' ? raw.url : '/';
      const queryIdx = path.indexOf('?');
      if (queryIdx !== -1) {
        path = path.substring(0, queryIdx);
      }
      if (!path.startsWith('/')) {
        path = '/' + path;
      }

      // 3. Headers normalization (lower-cased keys, case-insensitive)
      const headers: Record<string, string | readonly string[] | undefined> = {};
      if (typeof raw.headers === 'object' && raw.headers !== null) {
        for (const [k, v] of Object.entries(raw.headers as Record<string, unknown>)) {
          if (typeof v === 'string') {
            headers[k.toLowerCase()] = v;
          } else if (Array.isArray(v)) {
            headers[k.toLowerCase()] = Object.freeze([...v.map(String)]);
          } else if (v !== undefined && v !== null) {
            headers[k.toLowerCase()] = String(v);
          }
        }
      }

      // 4. Query normalization
      const query: Record<string, unknown> = {};
      if (typeof raw.query === 'object' && raw.query !== null) {
        for (const [k, v] of Object.entries(raw.query as Record<string, unknown>)) {
          query[k] = v;
        }
      } else {
        const fullUrl =
          typeof raw.url === 'string' ? raw.url : typeof raw.path === 'string' ? raw.path : '';
        const qIdx = fullUrl.indexOf('?');
        if (qIdx !== -1) {
          const searchParams = new URLSearchParams(fullUrl.substring(qIdx + 1));
          for (const [k, v] of searchParams.entries()) {
            query[k] = v;
          }
        }
      }

      // 5. Params normalization
      const params: Record<string, unknown> = {};
      if (typeof raw.params === 'object' && raw.params !== null) {
        for (const [k, v] of Object.entries(raw.params as Record<string, unknown>)) {
          params[k] = v;
        }
      }

      // 6. Cookies normalization
      const cookies: Record<string, string | undefined> = {};
      if (typeof raw.cookies === 'object' && raw.cookies !== null) {
        for (const [k, v] of Object.entries(raw.cookies as Record<string, unknown>)) {
          if (typeof v === 'string') {
            cookies[k] = v;
          } else if (v !== undefined && v !== null) {
            cookies[k] = String(v);
          }
        }
      }

      // 7. Body preservation
      const body = raw.body;

      return Object.freeze({
        method,
        path,
        headers: Object.freeze(headers),
        query: Object.freeze(query),
        params: Object.freeze(params),
        cookies: Object.freeze(cookies),
        body,
      });
    } catch (err) {
      if (err instanceof TransportNormalizationError) {
        throw err;
      }
      throw new TransportNormalizationError(
        `Failed to normalize transport request: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }
  }
}
