import { DispatchExecutionOutcome, IEventDispatcher } from './EventDispatcher';
import { EventRetryExecutor } from '../retry/EventRetryExecutor';
import {
  DomainEvent,
  EventHandlerContext,
  EventHandlerExecutionResult,
  EventHandlerRegistration,
} from '../types/eventTypes';

export class ParallelDispatcher implements IEventDispatcher {
  public async dispatch(
    event: DomainEvent,
    handlers: readonly EventHandlerRegistration[],
    signal?: AbortSignal,
  ): Promise<DispatchExecutionOutcome> {
    if (signal?.aborted) {
      return {
        results: Object.freeze([]),
        cancelled: true,
      };
    }

    const promises = handlers.map((handlerReg) => {
      const context: EventHandlerContext = Object.freeze({
        event,
        signal,
      });
      return EventRetryExecutor.execute(handlerReg, event, context);
    });

    const settled = await Promise.allSettled(promises);
    const results: EventHandlerExecutionResult[] = [];

    for (let i = 0; i < settled.length; i++) {
      const item = settled[i];
      if (item.status === 'fulfilled') {
        results.push(item.value);
      } else {
        const handlerReg = handlers[i];
        results.push({
          handlerId: handlerReg.id,
          success: false,
          error: {
            handlerId: handlerReg.id,
            message: item.reason instanceof Error ? item.reason.message : String(item.reason),
          },
          attempts: 1,
          durationMs: 0,
        });
      }
    }

    return {
      results: Object.freeze(results),
      cancelled: Boolean(signal?.aborted),
    };
  }
}
