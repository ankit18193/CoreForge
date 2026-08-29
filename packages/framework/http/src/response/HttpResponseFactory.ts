import { HttpHeaders, HttpResponse } from '@coreforge/contracts';

import { HttpErrorMapper } from './HttpErrorMapper';
import { HTTP_STATUS_CODES, HttpErrorMappingOptions } from '../types/httpTypes';

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

export class HttpResponseFactory {
  public static createSuccess<TBody = unknown>(
    status?: number,
    body?: TBody,
    headers: HttpHeaders = {},
    cookies?: Record<string, string>,
    metadata?: Record<string, unknown>,
  ): HttpResponse<TBody> {
    const finalStatus =
      status ??
      (body === undefined || body === null ? HTTP_STATUS_CODES.NO_CONTENT : HTTP_STATUS_CODES.OK);

    const clonedBody = body !== undefined ? deepCloneAndSanitize(body) : undefined;
    const clonedCookies = cookies ? deepCloneAndSanitize(cookies) : undefined;
    const clonedMetadata = metadata ? deepCloneAndSanitize(metadata) : undefined;

    const response: HttpResponse<TBody> = {
      status: finalStatus,
      headers: deepFreeze({ ...headers }),
      body: clonedBody !== undefined ? deepFreeze(clonedBody) : undefined,
      cookies: clonedCookies ? deepFreeze(clonedCookies) : undefined,
      metadata: clonedMetadata ? deepFreeze(clonedMetadata) : undefined,
    };

    return Object.freeze(response);
  }

  public static createFailure<TBody = never>(
    status: number,
    error: unknown,
    headers: HttpHeaders = {},
    cookies?: Record<string, string>,
    metadata?: Record<string, unknown>,
    options: HttpErrorMappingOptions = {},
  ): HttpResponse<TBody> {
    const errorPayload = HttpErrorMapper.toErrorPayload(error, options);
    const finalHeaders: HttpHeaders = {
      'content-type': 'application/json',
      ...headers,
    };

    const clonedCookies = cookies ? deepCloneAndSanitize(cookies) : undefined;
    const clonedMetadata = metadata ? deepCloneAndSanitize(metadata) : undefined;

    const response: HttpResponse<TBody> = {
      status,
      headers: deepFreeze(finalHeaders),
      body: errorPayload as unknown as TBody,
      cookies: clonedCookies ? deepFreeze(clonedCookies) : undefined,
      metadata: clonedMetadata ? deepFreeze(clonedMetadata) : undefined,
    };

    return Object.freeze(response);
  }
}
