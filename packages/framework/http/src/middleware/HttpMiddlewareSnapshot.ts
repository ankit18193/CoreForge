import type {
  HttpMiddlewareBatchResult,
  HttpMiddlewareContext,
  HttpMiddlewareResult,
  HttpRequest,
} from '@coreforge/contracts';

import { HttpRequestSnapshot } from '../request/HttpRequestSnapshot';

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

export class HttpMiddlewareSnapshot {
  public static deepFreeze<T>(obj: T): T {
    return deepFreeze(obj);
  }

  public static deepCloneAndSanitize<T>(value: T): T {
    return deepCloneAndSanitize(value);
  }

  public static createContext<TReq = unknown>(
    context: HttpMiddlewareContext<TReq>,
  ): Readonly<HttpMiddlewareContext<TReq>> {
    // 1. Snapshot the HttpRequest
    const requestSnapshot = HttpRequestSnapshot.create<TReq>(context.request);

    // 2. Clone & Freeze Parameters
    const clonedParams = deepCloneAndSanitize(context.parameters || {}) as Record<string, string>;
    const frozenParams = deepFreeze(clonedParams);

    // 3. Clone & Freeze Metadata
    const clonedMetadata = deepCloneAndSanitize(context.metadata || {}) as Record<string, unknown>;
    const frozenMetadata = deepFreeze(clonedMetadata);

    // 4. Clone & Freeze Route info if present
    let frozenRoute;
    if (context.route) {
      const clonedRouteMeta = context.route.metadata
        ? (deepCloneAndSanitize(context.route.metadata) as Record<string, unknown>)
        : undefined;

      frozenRoute = deepFreeze({
        id: context.route.id,
        method: context.route.method,
        path: context.route.path,
        operation: context.route.operation,
        metadata: clonedRouteMeta ? deepFreeze(clonedRouteMeta) : undefined,
      });
    }

    const snapshot: HttpMiddlewareContext<TReq> = {
      request: requestSnapshot as HttpRequest<TReq>,
      route: frozenRoute,
      parameters: frozenParams,
      transportContext: context.transportContext,
      executionContext: context.executionContext,
      metadata: frozenMetadata,
    };

    return Object.freeze(snapshot);
  }

  public static createResult<TResult = unknown>(
    result: HttpMiddlewareResult<TResult>,
  ): Readonly<HttpMiddlewareResult<TResult>> {
    const cloned = {
      middlewareId: result.middlewareId,
      state: result.state,
      success: result.success,
      value: result.value,
      error: result.error,
      durationMs: Number(result.durationMs) || 0,
    };

    return Object.freeze(cloned);
  }

  public static createBatchResult<TResult = unknown>(
    batch: HttpMiddlewareBatchResult<TResult>,
  ): Readonly<HttpMiddlewareBatchResult<TResult>> {
    const frozenResults = Object.freeze(
      (batch.results || []).map((r) => HttpMiddlewareSnapshot.createResult(r)),
    );

    const cloned: HttpMiddlewareBatchResult<TResult> = {
      success: batch.success,
      results: frozenResults,
      totalMiddleware: batch.totalMiddleware,
      executedMiddleware: batch.executedMiddleware,
      failedMiddleware: batch.failedMiddleware,
      skippedMiddleware: batch.skippedMiddleware,
      cancelledMiddleware: batch.cancelledMiddleware,
      durationMs: Number(batch.durationMs) || 0,
    };

    return Object.freeze(cloned);
  }
}
