import type {
  Event,
  EventFailureStrategy,
  EventHandlerResult,
  ExecutionContext,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { InterceptorEngine } from '@coreforge/interceptors';

import { IEventExecutor } from './EventExecutionStrategy';
import { EventDiagnostics } from '../diagnostics/EventDiagnostics';
import { EventCancellationError } from '../errors/EventErrors';
import { EventProfiler } from '../internal/EventProfiler';
import { EventResultFactory } from '../result/EventResultFactory';
import { RegisteredEventHandlerEntry } from '../types/eventTypes';

export class ConcurrentEventExecutor implements IEventExecutor {
  public async execute<TPayload>(
    event: Event<TPayload>,
    handlers: readonly RegisteredEventHandlerEntry<TPayload>[],
    context: ExecutionContext,
    _failureStrategy: EventFailureStrategy,
    executionEngine: ExecutionEngine,
    interceptorEngine: InterceptorEngine,
    diagnostics: EventDiagnostics,
  ): Promise<EventHandlerResult[]> {
    if (context.signal.aborted) {
      throw new EventCancellationError(
        'Execution context was aborted before concurrent event processing',
        { executionId: context.executionId, eventType: event.type },
      );
    }

    const promises = handlers.map(async (entry): Promise<EventHandlerResult> => {
      if (context.signal.aborted) {
        throw new EventCancellationError('Execution context was aborted during handler execution', {
          executionId: context.executionId,
          eventType: event.type,
          handlerName: entry.handlerName,
        });
      }

      const profiler = new EventProfiler().start();
      diagnostics.recordHandlerExecuted();

      let handlerExecuted = false;

      try {
        const execResult = await executionEngine.execute(
          event,
          async (execEvent, execCtx) => {
            const interceptorResult = await interceptorEngine.execute(
              execEvent,
              async (interceptorEvent, interceptorCtx) => {
                if (!handlerExecuted) {
                  handlerExecuted = true;
                }
                await entry.handler.handle(interceptorEvent as Event<TPayload>, interceptorCtx);
              },
              { context: execCtx },
            );

            return interceptorResult.value;
          },
          { context },
        );

        if (!execResult.success) {
          throw execResult.error;
        }

        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        diagnostics.recordHandlerSuccess();
        return EventResultFactory.createHandlerCompleted(entry.handlerName, durationMs);
      } catch (err: unknown) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        diagnostics.recordHandlerFailure();
        return EventResultFactory.createHandlerFailed(entry.handlerName, err, durationMs);
      }
    });

    return Promise.all(promises);
  }
}
