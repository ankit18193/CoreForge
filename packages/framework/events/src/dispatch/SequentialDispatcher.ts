import { DispatchExecutionOutcome, IEventDispatcher } from './EventDispatcher';
import { EventRetryExecutor } from '../retry/EventRetryExecutor';
import {
  DomainEvent,
  EventHandlerContext,
  EventHandlerExecutionResult,
  EventHandlerRegistration,
} from '../types/eventTypes';

export class SequentialDispatcher implements IEventDispatcher {
  public async dispatch(
    event: DomainEvent,
    handlers: readonly EventHandlerRegistration[],
    signal?: AbortSignal,
  ): Promise<DispatchExecutionOutcome> {
    const results: EventHandlerExecutionResult[] = [];
    let cancelled = false;

    for (const handlerReg of handlers) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }

      const context: EventHandlerContext = Object.freeze({
        event,
        signal,
      });

      const result = await EventRetryExecutor.execute(handlerReg, event, context);
      results.push(result);
    }

    if (signal?.aborted) {
      cancelled = true;
    }

    return {
      results: Object.freeze(results),
      cancelled,
    };
  }
}
