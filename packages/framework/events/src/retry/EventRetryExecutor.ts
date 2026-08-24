import {
  DomainEvent,
  EventHandlerContext,
  EventHandlerExecutionResult,
  EventHandlerRegistration,
  EventRetryPolicy,
} from '../types/eventTypes';

export class EventRetryExecutor {
  public static async execute(
    registration: EventHandlerRegistration,
    event: DomainEvent,
    context: EventHandlerContext,
  ): Promise<EventHandlerExecutionResult> {
    const retryPolicy: EventRetryPolicy = registration.retry || { maxAttempts: 1 };
    const maxAttempts = Math.max(1, retryPolicy.maxAttempts);
    const delayMs = retryPolicy.delayMs ?? 0;

    let attempts = 0;
    let lastError: unknown;
    const start = Date.now();

    while (attempts < maxAttempts) {
      if (context.signal?.aborted) {
        break;
      }

      attempts++;
      try {
        await registration.handler(event, context);
        return {
          handlerId: registration.id,
          success: true,
          attempts,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        lastError = err;
        if (attempts < maxAttempts && delayMs > 0 && !context.signal?.aborted) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const errorMessage =
      lastError instanceof Error ? lastError.message : String(lastError || 'Unknown handler error');
    const errorCode =
      lastError instanceof Error &&
      'code' in lastError &&
      typeof (lastError as { code: unknown }).code === 'string'
        ? (lastError as { code: string }).code
        : undefined;

    return {
      handlerId: registration.id,
      success: false,
      error: {
        handlerId: registration.id,
        message: errorMessage,
        code: errorCode,
      },
      attempts,
      durationMs: Date.now() - start,
    };
  }
}
