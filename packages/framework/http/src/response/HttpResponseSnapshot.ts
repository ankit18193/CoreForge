import type {
  HttpCircularReferencePolicy,
  HttpResponse,
  HttpSerializationContext,
  HttpSerializationResult,
} from '@coreforge/contracts';

import { HttpSerializationError } from '../errors/HttpSerializationErrors';

export class HttpResponseSnapshot {
  /**
   * Deep clone a value with explicit circular reference handling.
   * If policy is 'ERROR', encounters of circular references throw an HttpSerializationError.
   * If policy is 'SANITIZE', circular references are replaced with '[Circular]'.
   */
  public static cloneValue<T>(
    value: T,
    policy: HttpCircularReferencePolicy = 'ERROR',
    seen = new WeakSet<object>(),
  ): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value)) {
      if (policy === 'SANITIZE') {
        return '[Circular]' as unknown as T;
      }
      throw new HttpSerializationError('Circular reference detected during serialization clone');
    }
    seen.add(value);

    if (Array.isArray(value)) {
      const copy = new Array(value.length);
      for (let i = 0; i < value.length; i++) {
        copy[i] = HttpResponseSnapshot.cloneValue(value[i], policy, seen);
      }
      return copy as unknown as T;
    }

    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T;
    }

    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags) as unknown as T;
    }

    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return Buffer.from(value) as unknown as T;
    }

    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      copy[k] = HttpResponseSnapshot.cloneValue(v, policy, seen);
    }

    return copy as unknown as T;
  }

  /**
   * Recursively deep-freeze any object or array, protecting against circular references.
   */
  public static deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value)) {
      return value;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        HttpResponseSnapshot.deepFreeze(value[i], seen);
      }
      return Object.freeze(value) as unknown as T;
    }

    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const prop = obj[key];
      if (prop !== null && typeof prop === 'object') {
        HttpResponseSnapshot.deepFreeze(prop, seen);
      }
    }

    return Object.freeze(value);
  }

  /**
   * Create an immutable snapshot of an HttpResponse.
   */
  public static createResponse<TBody = unknown>(
    response: HttpResponse<TBody>,
    policy: HttpCircularReferencePolicy = 'ERROR',
  ): HttpResponse<TBody> {
    const clonedBody =
      response.body !== undefined
        ? HttpResponseSnapshot.cloneValue(response.body, policy)
        : undefined;

    const clonedHeaders: Record<string, string | readonly string[]> = {};
    if (response.headers) {
      for (const [k, v] of Object.entries(response.headers)) {
        if (Array.isArray(v)) {
          clonedHeaders[k.toLowerCase()] = Object.freeze([...(v as readonly string[])]);
        } else if (typeof v === 'string') {
          clonedHeaders[k.toLowerCase()] = v;
        } else if (v !== undefined && v !== null) {
          clonedHeaders[k.toLowerCase()] = String(v);
        }
      }
    }

    const clonedMetadata =
      response.metadata !== undefined
        ? HttpResponseSnapshot.cloneValue(response.metadata, policy)
        : undefined;

    const frozen: HttpResponse<TBody> = {
      status: response.status,
      headers: HttpResponseSnapshot.deepFreeze(clonedHeaders),
      body: clonedBody !== undefined ? HttpResponseSnapshot.deepFreeze(clonedBody) : undefined,
      cookies: response.cookies
        ? (HttpResponseSnapshot.deepFreeze({ ...response.cookies }) as Record<string, string>)
        : undefined,
      metadata:
        clonedMetadata !== undefined
          ? (HttpResponseSnapshot.deepFreeze(clonedMetadata) as Record<string, unknown>)
          : undefined,
    };

    return Object.freeze(frozen);
  }

  /**
   * Create a sanitized, immutable serialization context.
   */
  public static createContext(
    mediaType: string,
    options: {
      readonly charset?: string | undefined;
      readonly operation?: string | undefined;
      readonly status?: number | undefined;
      readonly metadata?: Record<string, unknown> | undefined;
    } = {},
  ): HttpSerializationContext {
    const ctx: HttpSerializationContext = {
      mediaType: mediaType.trim().toLowerCase(),
      charset: options.charset ? options.charset.trim().toLowerCase() : undefined,
      operation: options.operation,
      status: options.status,
      metadata: options.metadata
        ? (HttpResponseSnapshot.deepFreeze({ ...options.metadata }) as Record<string, unknown>)
        : undefined,
    };
    return Object.freeze(ctx);
  }

  /**
   * Create an immutable serialization result.
   */
  public static createResult<T = unknown>(
    success: boolean,
    durationMs: number,
    value?: T,
    serializerId?: string,
    mediaType?: string,
    error?: unknown,
  ): HttpSerializationResult<T> {
    return Object.freeze({
      success,
      value: value !== undefined ? HttpResponseSnapshot.deepFreeze(value) : undefined,
      serializerId,
      mediaType,
      durationMs,
      error,
    });
  }
}
