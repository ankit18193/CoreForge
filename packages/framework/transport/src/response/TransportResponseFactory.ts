import {
  ApplicationResult,
  DispatchResult,
  QueryResult,
  TransportMetadata,
  TransportResponse,
} from '@coreforge/contracts';

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

export class TransportResponseFactory {
  public static createSuccess<TBody = unknown>(
    body?: TBody,
    metadata?: TransportMetadata,
  ): TransportResponse<TBody> {
    const clonedBody = body !== undefined ? deepCloneAndSanitize(body) : undefined;
    const clonedMetadata = metadata
      ? (deepCloneAndSanitize(metadata) as TransportMetadata)
      : undefined;

    const frozenBody = clonedBody !== undefined ? deepFreeze(clonedBody) : undefined;
    const frozenMetadata = clonedMetadata ? deepFreeze(clonedMetadata) : undefined;

    const response: TransportResponse<TBody> = {
      success: true,
      body: frozenBody,
      metadata: frozenMetadata,
    };

    return Object.freeze(response);
  }

  public static createFailure<TBody = never>(
    error: unknown,
    metadata?: TransportMetadata,
  ): TransportResponse<TBody> {
    const clonedMetadata = metadata
      ? (deepCloneAndSanitize(metadata) as TransportMetadata)
      : undefined;
    const frozenMetadata = clonedMetadata ? deepFreeze(clonedMetadata) : undefined;

    const response: TransportResponse<TBody> = {
      success: false,
      error,
      metadata: frozenMetadata,
    };

    return Object.freeze(response);
  }

  public static fromApplicationResult<TResult = unknown>(
    result: ApplicationResult<TResult>,
    extraMetadata?: TransportMetadata,
  ): TransportResponse<TResult> {
    const meta: TransportMetadata = {
      executionId: result.executionId,
      durationMs: result.durationMs,
      serviceType: result.serviceType,
      state: result.state,
      ...extraMetadata,
    };

    if (result.success) {
      return TransportResponseFactory.createSuccess<TResult>(result.value, meta);
    }

    return TransportResponseFactory.createFailure<TResult>(result.error, meta);
  }

  public static fromDispatchResult<TResult = unknown>(
    result: DispatchResult<TResult>,
    extraMetadata?: TransportMetadata,
  ): TransportResponse<TResult> {
    const meta: TransportMetadata = {
      executionId: result.executionId,
      durationMs: result.durationMs,
      commandType: result.commandType,
      state: result.state,
      ...extraMetadata,
    };

    if (result.success) {
      return TransportResponseFactory.createSuccess<TResult>(result.value, meta);
    }

    return TransportResponseFactory.createFailure<TResult>(result.error, meta);
  }

  public static fromQueryResult<TResult = unknown>(
    result: QueryResult<TResult>,
    extraMetadata?: TransportMetadata,
  ): TransportResponse<TResult> {
    const meta: TransportMetadata = {
      executionId: result.executionId,
      durationMs: result.durationMs,
      queryType: result.queryType,
      state: result.state,
      ...extraMetadata,
    };

    if (result.success) {
      return TransportResponseFactory.createSuccess<TResult>(result.value, meta);
    }

    return TransportResponseFactory.createFailure<TResult>(result.error, meta);
  }
}
