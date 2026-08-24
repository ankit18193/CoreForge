import {
  DomainEvent,
  EventBus as IEventBus,
  EventDiagnosticsSnapshot,
  EventDispatchMode,
  EventDispatchOptions,
  EventDispatchResult,
  EventFailureDescriptor,
  EventHandler,
  EventHandlerContext,
  EventHandlerOptions,
  EventRetryPolicy,
} from '@coreforge/contracts';

export type {
  DomainEvent,
  IEventBus,
  EventDiagnosticsSnapshot,
  EventDispatchMode,
  EventDispatchOptions,
  EventDispatchResult,
  EventFailureDescriptor,
  EventHandler,
  EventHandlerContext,
  EventHandlerOptions,
  EventRetryPolicy,
};

export type EventState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface EventBusOptions {
  readonly defaultDispatchMode?: EventDispatchMode | undefined;
  readonly autoStart?: boolean | undefined;
  readonly enableDiagnostics?: boolean | undefined;
}

export interface EventHandlerRegistration<T extends DomainEvent = DomainEvent> {
  readonly id: string;
  readonly eventType: string;
  readonly handler: EventHandler<T>;
  readonly priority: number;
  readonly registrationIndex: number;
  readonly retry?: EventRetryPolicy | undefined;
}

export interface EventHandlerExecutionResult {
  readonly handlerId: string;
  readonly success: boolean;
  readonly error?: EventFailureDescriptor | undefined;
  readonly attempts: number;
  readonly durationMs: number;
}
