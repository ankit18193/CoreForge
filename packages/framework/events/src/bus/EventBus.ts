import { EventDiagnostics } from '../diagnostics/EventDiagnostics';
import { ParallelDispatcher } from '../dispatch/ParallelDispatcher';
import { SequentialDispatcher } from '../dispatch/SequentialDispatcher';
import { EventPayloadError } from '../errors/EventErrors';
import { EventFactory } from '../event/EventFactory';
import { EventHandlerRegistry } from '../handler/EventHandlerRegistry';
import { EventHandlerResolver } from '../handler/EventHandlerResolver';
import { EventProfiler } from '../internal/EventProfiler';
import { EventLifecycleManager } from '../lifecycle/EventLifecycleManager';
import { EventSubscription } from '../subscription/EventSubscription';
import { SubscriptionRegistry } from '../subscription/SubscriptionRegistry';
import {
  DomainEvent,
  EventBusOptions,
  EventDiagnosticsSnapshot,
  EventDispatchMode,
  EventDispatchOptions,
  EventDispatchResult,
  EventFailureDescriptor,
  EventHandler,
  EventHandlerOptions,
  EventState,
  IEventBus,
} from '../types/eventTypes';

export class EventBus implements IEventBus {
  private readonly _handlerRegistry = new EventHandlerRegistry();
  private readonly _subscriptionRegistry = new SubscriptionRegistry();
  private readonly _resolver = new EventHandlerResolver(this._handlerRegistry);
  private readonly _lifecycle = new EventLifecycleManager();
  private readonly _diagnostics = new EventDiagnostics();
  private readonly _sequentialDispatcher = new SequentialDispatcher();
  private readonly _parallelDispatcher = new ParallelDispatcher();

  private readonly _defaultDispatchMode: EventDispatchMode;
  private readonly _autoStart: boolean;
  private readonly _enableDiagnostics: boolean;

  constructor(options: EventBusOptions = {}) {
    this._defaultDispatchMode = options.defaultDispatchMode ?? 'SEQUENTIAL';
    this._autoStart = options.autoStart ?? true;
    this._enableDiagnostics = options.enableDiagnostics ?? true;

    if (this._autoStart) {
      this._lifecycle.start();
    }
  }

  public get state(): EventState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.ready;
  }

  public get diagnostics(): EventDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public start(): void {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.setStopping();
    this._subscriptionRegistry.clear();
    this._handlerRegistry.clear();
    this._lifecycle.stop();
  }

  public subscribe<T extends DomainEvent = DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options: EventHandlerOptions = {},
  ): EventSubscription {
    this._lifecycle.assertCanSubscribe();

    const registration = this._handlerRegistry.register(eventType, handler, options);
    const subscription = new EventSubscription(registration.id, eventType, () => {
      this._handlerRegistry.unregister(registration.id);
      this._subscriptionRegistry.unregister(registration.id);
    });

    this._subscriptionRegistry.register(subscription);
    return subscription;
  }

  public async emit<T extends DomainEvent = DomainEvent>(
    event: T,
    options: EventDispatchOptions = {},
  ): Promise<EventDispatchResult> {
    this._lifecycle.assertCanEmit(this._autoStart);

    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      throw new EventPayloadError('Event must be an object with a valid string type.');
    }

    const profiler = new EventProfiler();

    // Ensure event is a normalized, immutable DomainEvent
    const immutableEvent: DomainEvent = Object.isFrozen(event)
      ? (event as unknown as DomainEvent)
      : EventFactory.create(event.type, event.payload, event.id);

    const handlers = this._resolver.resolve(immutableEvent);
    const mode = options.mode ?? this._defaultDispatchMode;
    const signal = options.signal;

    const dispatcher = mode === 'PARALLEL' ? this._parallelDispatcher : this._sequentialDispatcher;
    const outcome = await dispatcher.dispatch(immutableEvent, handlers, signal);

    const durationMs = profiler.stop();

    let successfulHandlers = 0;
    let failedHandlers = 0;
    let totalRetries = 0;
    const failureDescriptors: EventFailureDescriptor[] = [];

    for (const res of outcome.results) {
      if (res.success) {
        successfulHandlers++;
      } else {
        failedHandlers++;
        if (res.error) {
          failureDescriptors.push(res.error);
        }
      }
      totalRetries += Math.max(0, res.attempts - 1);
    }

    const isSuccess = failedHandlers === 0 && !outcome.cancelled;

    if (this._enableDiagnostics) {
      this._diagnostics.recordEvent(
        immutableEvent.type,
        isSuccess,
        outcome.cancelled,
        outcome.results.length,
        failedHandlers,
        totalRetries,
        durationMs,
      );
    }

    return Object.freeze({
      eventId: immutableEvent.id,
      eventType: immutableEvent.type,
      handlerCount: handlers.length,
      successfulHandlers,
      failedHandlers,
      cancelled: outcome.cancelled,
      durationMs,
      errors: failureDescriptors.length > 0 ? Object.freeze(failureDescriptors) : undefined,
    });
  }
}
