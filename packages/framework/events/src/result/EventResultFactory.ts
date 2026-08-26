import { EventHandlerResult, EventPublishResult } from '../types/eventTypes';

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

export class EventResultFactory {
  public static createHandlerCompleted(
    handlerName: string,
    durationMs: number,
  ): EventHandlerResult {
    return Object.freeze({
      handlerName,
      success: true,
      durationMs,
    });
  }

  public static createHandlerFailed(
    handlerName: string,
    error: unknown,
    durationMs: number,
  ): EventHandlerResult {
    return Object.freeze({
      handlerName,
      success: false,
      error,
      durationMs,
    });
  }

  public static createPublishCompleted(
    eventType: string,
    executionId: string,
    durationMs: number,
    handlerResults: readonly EventHandlerResult[],
  ): EventPublishResult {
    const successfulHandlers = handlerResults.filter((r) => r.success).length;
    const failedHandlers = handlerResults.length - successfulHandlers;

    return Object.freeze({
      success: true,
      eventType,
      executionId,
      durationMs,
      handlerCount: handlerResults.length,
      successfulHandlers,
      failedHandlers,
      handlerResults: deepFreeze([...handlerResults]),
      state: 'COMPLETED' as const,
    });
  }

  public static createPublishFailed(
    eventType: string,
    executionId: string,
    durationMs: number,
    handlerResults: readonly EventHandlerResult[],
  ): EventPublishResult {
    const successfulHandlers = handlerResults.filter((r) => r.success).length;
    const failedHandlers = handlerResults.length - successfulHandlers;

    return Object.freeze({
      success: false,
      eventType,
      executionId,
      durationMs,
      handlerCount: handlerResults.length,
      successfulHandlers,
      failedHandlers,
      handlerResults: deepFreeze([...handlerResults]),
      state: 'FAILED' as const,
    });
  }

  public static createPublishCancelled(
    eventType: string,
    executionId: string,
    durationMs: number,
    handlerResults: readonly EventHandlerResult[],
  ): EventPublishResult {
    const successfulHandlers = handlerResults.filter((r) => r.success).length;
    const failedHandlers = handlerResults.length - successfulHandlers;

    return Object.freeze({
      success: false,
      eventType,
      executionId,
      durationMs,
      handlerCount: handlerResults.length,
      successfulHandlers,
      failedHandlers,
      handlerResults: deepFreeze([...handlerResults]),
      state: 'CANCELLED' as const,
    });
  }
}
