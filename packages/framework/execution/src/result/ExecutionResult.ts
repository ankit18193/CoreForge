import { ExecutionResult } from '@coreforge/contracts';

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

export class ExecutionResultFactory {
  public static createSuccess<TResult>(
    executionId: string,
    value: TResult,
    durationMs: number,
  ): ExecutionResult<TResult> {
    const frozenValue = value !== null && typeof value === 'object' ? deepFreeze(value) : value;

    return Object.freeze({
      success: true,
      value: frozenValue,
      executionId,
      durationMs,
      state: 'COMPLETED' as const,
    });
  }

  public static createFailure<TResult = unknown>(
    executionId: string,
    error: unknown,
    durationMs: number,
  ): ExecutionResult<TResult> {
    return Object.freeze({
      success: false,
      error,
      executionId,
      durationMs,
      state: 'FAILED' as const,
    });
  }

  public static createCancelled<TResult = unknown>(
    executionId: string,
    error: unknown,
    durationMs: number,
  ): ExecutionResult<TResult> {
    return Object.freeze({
      success: false,
      error,
      executionId,
      durationMs,
      state: 'CANCELLED' as const,
    });
  }
}
