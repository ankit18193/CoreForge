import {
  ApplicationEventDiagnosticsSnapshot as EventDiagnosticsSnapshot,
  Event,
  EventExecutionMode,
  EventFailureStrategy,
  EventHandler,
  EventHandlerOptions,
  EventHandlerResult,
  EventPublisher as IEventPublisher,
  EventPublishOptions,
  EventPublishResult,
  ExecutionContext,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

export type {
  Event,
  EventDiagnosticsSnapshot,
  EventExecutionMode,
  EventFailureStrategy,
  EventHandler,
  EventHandlerOptions,
  EventHandlerResult,
  EventPublishOptions,
  EventPublishResult,
  ExecutionContext,
  IEventPublisher,
};

export type EventState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface EventPublisherOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly interceptorEngine?: InterceptorEngine | undefined;
  readonly autoStart?: boolean | undefined;
  readonly defaultMode?: EventExecutionMode | undefined;
  readonly defaultFailureStrategy?: EventFailureStrategy | undefined;
}

export interface RegisteredEventHandlerEntry<TPayload = unknown> {
  readonly handler: EventHandler<TPayload>;
  readonly priority: number;
  readonly sequence: number;
  readonly handlerName: string;
}
