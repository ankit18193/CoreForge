import {
  ApplicationError,
  ErrorProcessingResult,
  ErrorProcessingState,
} from '../types/errorHandlingTypes';

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

export class ErrorResultFactory {
  public static createHandled<TResult = unknown>(
    error: ApplicationError,
    executionId: string,
    durationMs: number,
    matchedHandlers: number,
  ): ErrorProcessingResult<TResult> {
    return Object.freeze({
      state: 'HANDLED' as ErrorProcessingState,
      error: deepFreeze(error),
      executionId,
      durationMs,
      matchedHandlers,
    });
  }

  public static createTransformed<TResult = unknown>(
    error: ApplicationError,
    transformedError: ApplicationError,
    executionId: string,
    durationMs: number,
    matchedHandlers: number,
  ): ErrorProcessingResult<TResult> {
    return Object.freeze({
      state: 'TRANSFORMED' as ErrorProcessingState,
      error: deepFreeze(error),
      transformedError: deepFreeze(transformedError),
      executionId,
      durationMs,
      matchedHandlers,
    });
  }

  public static createRecovered<TResult = unknown>(
    error: ApplicationError,
    result: TResult,
    executionId: string,
    durationMs: number,
    matchedHandlers: number,
  ): ErrorProcessingResult<TResult> {
    const frozenResult =
      result !== null && typeof result === 'object' ? deepFreeze(result) : result;

    return Object.freeze({
      state: 'RECOVERED' as ErrorProcessingState,
      error: deepFreeze(error),
      result: frozenResult,
      executionId,
      durationMs,
      matchedHandlers,
    });
  }

  public static createRethrown<TResult = unknown>(
    error: ApplicationError,
    executionId: string,
    durationMs: number,
    matchedHandlers: number,
  ): ErrorProcessingResult<TResult> {
    return Object.freeze({
      state: 'RETHROWN' as ErrorProcessingState,
      error: deepFreeze(error),
      executionId,
      durationMs,
      matchedHandlers,
    });
  }

  public static createUnresolved<TResult = unknown>(
    error: ApplicationError,
    executionId: string,
    durationMs: number,
  ): ErrorProcessingResult<TResult> {
    return Object.freeze({
      state: 'UNRESOLVED' as ErrorProcessingState,
      error: deepFreeze(error),
      executionId,
      durationMs,
      matchedHandlers: 0,
    });
  }

  public static createCancelled<TResult = unknown>(
    error: ApplicationError,
    executionId: string,
    durationMs: number,
  ): ErrorProcessingResult<TResult> {
    return Object.freeze({
      state: 'CANCELLED' as ErrorProcessingState,
      error: deepFreeze(error),
      executionId,
      durationMs,
      matchedHandlers: 0,
    });
  }
}
