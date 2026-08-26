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

export class SequentialEventExecutor implements IEventExecutor {
  public async execute<TPayload>(
    event: Event<TPayload>,
    handlers: readonly RegisteredEventHandlerEntry<TPayload>[],
    context: ExecutionContext,
    failureStrategy: EventFailureStrategy,
    executionEngine: ExecutionEngine,
    interceptorEngine: InterceptorEngine,
    diagnostics: EventDiagnostics,
  ): Promise<EventHandlerResult[]> {
    const results: EventHandlerResult[] = [];

    for (const entry of handlers) {
      if (context.signal.aborted) {
        throw new EventCancellationError(
          'Execution context was aborted during sequential event processing',
          { executionId: context.executionId, eventType: event.type },
        );
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
        results.push(EventResultFactory.createHandlerCompleted(entry.handlerName, durationMs));
      } catch (err: unknown) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        diagnostics.recordHandlerFailure();
        results.push(EventResultFactory.createHandlerFailed(entry.handlerName, err, durationMs));

        if (failureStrategy === 'STOP') {
          break;
        }
      }
    }

    return results;
  }
}
