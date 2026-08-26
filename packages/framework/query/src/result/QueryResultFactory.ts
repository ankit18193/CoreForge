import { QueryResult } from '../types/queryTypes';

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item, seen);
    }
    return Object.freeze(obj) as T;
  }

  const propNames = Reflect.ownKeys(obj as object);
  for (const name of propNames) {
    const value = (obj as Record<string | symbol, unknown>)[name];
    if (value && typeof value === 'object') {
      deepFreeze(value, seen);
    }
  }

  return Object.freeze(obj) as T;
}

export class QueryResultFactory {
  public static createCompleted<TResult>(
    queryType: string,
    executionId: string,
    value: TResult,
    durationMs: number,
  ): QueryResult<TResult> {
    const frozenValue = value !== null && typeof value === 'object' ? deepFreeze(value) : value;

    return Object.freeze({
      success: true,
      value: frozenValue,
      queryType,
      executionId,
      durationMs,
      state: 'COMPLETED' as const,
    });
  }

  public static createFailed<TResult = unknown>(
    queryType: string,
    executionId: string,
    error: unknown,
    durationMs: number,
  ): QueryResult<TResult> {
    return Object.freeze({
      success: false,
      error,
      queryType,
      executionId,
      durationMs,
      state: 'FAILED' as const,
    });
  }

  public static createCancelled<TResult = unknown>(
    queryType: string,
    executionId: string,
    error: unknown,
    durationMs: number,
  ): QueryResult<TResult> {
    return Object.freeze({
      success: false,
      error,
      queryType,
      executionId,
      durationMs,
      state: 'CANCELLED' as const,
    });
  }
}
