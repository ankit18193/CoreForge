import { HttpHeaders, HttpPathParameters, HttpQuery, HttpRequest } from '@coreforge/contracts';

import { HttpRequestValidator } from './HttpRequestValidator';

function deepCloneAndSanitize<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (seen.has(value)) {
    return '[Circular]' as unknown as T;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const copy = value.map((item) => deepCloneAndSanitize(item, seen));
    return copy as unknown as T;
  }

  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    copy[k] = deepCloneAndSanitize(v, seen);
  }

  return copy as unknown as T;
}

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return obj;
  }

  seen.add(obj);

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        deepFreeze(item, seen);
      }
    }
  } else {
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        deepFreeze(val, seen);
      }
    }
  }

  return obj;
}

function normalizeHeaders(rawHeaders: HttpHeaders | undefined): HttpHeaders {
  if (!rawHeaders || typeof rawHeaders !== 'object') {
    return {};
  }

  const normalized: Record<string, string | readonly string[]> = {};

  for (const [key, val] of Object.entries(rawHeaders)) {
    const lowerKey = key.trim().toLowerCase();
    if (typeof val === 'string') {
      normalized[lowerKey] = val;
    } else if (Array.isArray(val)) {
      normalized[lowerKey] = Object.freeze(val.map((item) => String(item)));
    } else if (val !== undefined && val !== null) {
      normalized[lowerKey] = String(val);
    }
  }

  return normalized;
}

function extractQueryFromUrl(url: string, existingQuery?: HttpQuery): HttpQuery {
  const query: HttpQuery = {
    ...(existingQuery || {}),
  };

  if (url.includes('?')) {
    const queryString = url.split('?')[1];
    try {
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        if (!(key in query)) {
          query[key] = value;
        }
      }
    } catch {
      // Ignore URL parsing errors and keep existing query
    }
  }

  return query;
}

export class HttpRequestSnapshot {
  public static create<TBody = unknown>(rawRequest: unknown): HttpRequest<TBody> {
    const validated = HttpRequestValidator.validate<TBody>(rawRequest);

    // 1. Normalize headers (lowercase names, preserve original values)
    const normalizedHeaders = normalizeHeaders(validated.headers);

    // 2. Extract path and query
    const path = validated.path || HttpRequestValidator.extractPath(validated.url);
    const query = extractQueryFromUrl(validated.url, validated.query);

    // 3. Deep clone & cycle sanitize all components
    const clonedBody =
      validated.body !== undefined ? deepCloneAndSanitize(validated.body) : undefined;
    const clonedQuery = deepCloneAndSanitize(query) as HttpQuery;
    const clonedParams = validated.pathParameters
      ? (deepCloneAndSanitize(validated.pathParameters) as HttpPathParameters)
      : undefined;
    const clonedCookies = validated.cookies
      ? (deepCloneAndSanitize(validated.cookies) as Record<string, string>)
      : undefined;
    const clonedMetadata = validated.metadata
      ? (deepCloneAndSanitize(validated.metadata) as Record<string, unknown>)
      : undefined;

    // 4. Deep freeze all components
    const frozenHeaders = deepFreeze(normalizedHeaders);
    const frozenQuery = deepFreeze(clonedQuery);
    const frozenParams = clonedParams ? deepFreeze(clonedParams) : undefined;
    const frozenCookies = clonedCookies ? deepFreeze(clonedCookies) : undefined;
    const frozenBody = clonedBody !== undefined ? deepFreeze(clonedBody) : undefined;
    const frozenMetadata = clonedMetadata ? deepFreeze(clonedMetadata) : undefined;

    const snapshot: HttpRequest<TBody> = {
      method: validated.method,
      url: validated.url,
      path,
      headers: frozenHeaders,
      query: frozenQuery,
      pathParameters: frozenParams,
      cookies: frozenCookies,
      body: frozenBody,
      metadata: frozenMetadata,
      signal: validated.signal,
    };

    return Object.freeze(snapshot);
  }
}
