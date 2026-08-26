import { DispatchResult } from '../types/dispatchTypes';

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

export class DispatchResultFactory {
  public static createCompleted<TResult>(
    commandType: string,
    executionId: string,
    value: TResult,
    durationMs: number,
  ): DispatchResult<TResult> {
    const frozenValue = value !== null && typeof value === 'object' ? deepFreeze(value) : value;

    return Object.freeze({
      success: true,
      value: frozenValue,
      commandType,
      executionId,
      durationMs,
      state: 'COMPLETED' as const,
    });
  }

  public static createFailed<TResult = unknown>(
    commandType: string,
    executionId: string,
    error: unknown,
    durationMs: number,
  ): DispatchResult<TResult> {
    return Object.freeze({
      success: false,
      error,
      commandType,
      executionId,
      durationMs,
      state: 'FAILED' as const,
    });
  }

  public static createCancelled<TResult = unknown>(
    commandType: string,
    executionId: string,
    error: unknown,
    durationMs: number,
  ): DispatchResult<TResult> {
    return Object.freeze({
      success: false,
      error,
      commandType,
      executionId,
      durationMs,
      state: 'CANCELLED' as const,
    });
  }
}
