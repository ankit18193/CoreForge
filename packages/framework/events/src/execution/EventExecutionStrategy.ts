import type {
  Event,
  EventFailureStrategy,
  EventHandlerResult,
  ExecutionContext,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { InterceptorEngine } from '@coreforge/interceptors';

import { EventDiagnostics } from '../diagnostics/EventDiagnostics';
import { RegisteredEventHandlerEntry } from '../types/eventTypes';

export interface IEventExecutor {
  execute<TPayload>(
    event: Event<TPayload>,
    handlers: readonly RegisteredEventHandlerEntry<TPayload>[],
    context: ExecutionContext,
    failureStrategy: EventFailureStrategy,
    executionEngine: ExecutionEngine,
    interceptorEngine: InterceptorEngine,
    diagnostics: EventDiagnostics,
  ): Promise<EventHandlerResult[]>;
}
