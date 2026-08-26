import type {
  Event,
  EventDiagnosticsSnapshot,
  EventExecutionMode,
  EventFailureStrategy,
  EventHandler,
  EventHandlerOptions,
  EventHandlerResult,
  EventPublisher as IEventPublisher,
  EventPublishOptions,
  EventPublishResult,
} from '@coreforge/contracts';
import { ExecutionCancellationError, ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { EventDiagnostics } from '../diagnostics/EventDiagnostics';
import { EventCancellationError } from '../errors/EventErrors';
import { EventSnapshot } from '../event/EventSnapshot';
import { EventValidator } from '../event/EventValidator';
import { ConcurrentEventExecutor } from '../execution/ConcurrentEventExecutor';
import { SequentialEventExecutor } from '../execution/SequentialEventExecutor';
import { EventProfiler } from '../internal/EventProfiler';
import { EventLifecycleManager } from '../lifecycle/EventLifecycleManager';
import { EventHandlerRegistry } from '../registry/EventHandlerRegistry';
import { EventHandlerResolver } from '../registry/EventHandlerResolver';
import { EventResultFactory } from '../result/EventResultFactory';
import { EventPublisherOptions, EventState } from '../types/eventTypes';

export class EventPublisher implements IEventPublisher {
  private readonly _lifecycle: EventLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _registry: EventHandlerRegistry;
  private readonly _diagnostics: EventDiagnostics;
  private readonly _sequentialExecutor: SequentialEventExecutor;
  private readonly _concurrentExecutor: ConcurrentEventExecutor;
  private readonly _defaultMode: EventExecutionMode;
  private readonly _defaultFailureStrategy: EventFailureStrategy;

  constructor(options: EventPublisherOptions = {}) {
    this._lifecycle = new EventLifecycleManager();
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._executionEngine = options.executionEngine ?? new ExecutionEngine({ autoStart: false });
    this._interceptorEngine =
      options.interceptorEngine ?? new InterceptorEngine({ autoStart: false });
    this._registry = new EventHandlerRegistry();
    this._diagnostics = new EventDiagnostics();
    this._sequentialExecutor = new SequentialEventExecutor();
    this._concurrentExecutor = new ConcurrentEventExecutor();
    this._defaultMode = options.defaultMode ?? 'SEQUENTIAL';
    this._defaultFailureStrategy = options.defaultFailureStrategy ?? 'CONTINUE';

    if (options.autoStart) {
      this.startSync();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): EventState {
    return this._lifecycle.state;
  }

  public get executionEngine(): ExecutionEngine {
    return this._executionEngine;
  }

  public get interceptorEngine(): InterceptorEngine {
    return this._interceptorEngine;
  }

  public startSync(): void {
    if (!this._executionEngine.ready) {
      this._executionEngine.start();
    }
    if (!this._interceptorEngine.ready) {
      this._interceptorEngine.start();
    }
    this._lifecycle.start();
    this._registry.lock();
  }

  public async start(): Promise<void> {
    this.startSync();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    await this._interceptorEngine.stop();
    this._executionEngine.stop();
    this._lifecycle.transitionToStopped();
  }

  public register<TPayload = unknown>(
    type: string,
    handler: EventHandler<TPayload>,
    options?: EventHandlerOptions,
  ): void {
    try {
      this._lifecycle.ensureCanRegister();
      this._registry.register(type, handler, options);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public async publish<TPayload = unknown>(
    event: Event<TPayload>,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult> {
    this._lifecycle.ensureReadyForPublish();

    EventValidator.validate<TPayload>(event);
    const snapshotEvent = EventSnapshot.create(event);

    const handlers = EventHandlerResolver.resolve<TPayload>(this._registry, snapshotEvent.type);

    if (handlers.length === 0) {
      this._diagnostics.recordHandlerNotFound();
    }

    if (this._contextManager.current()) {
      this._diagnostics.recordNestedPublication();
    }

    const context = options?.context ?? this._contextManager.create({ autoStart: true });
    if (context.state === 'CREATED') {
      context.start();
    }

    const mode = options?.mode ?? this._defaultMode;
    const failureStrategy = options?.failureStrategy ?? this._defaultFailureStrategy;

    const profiler = new EventProfiler().start();
    this._diagnostics.recordPublicationStarted();

    return this._contextManager.run(context, async () => {
      if (context.signal.aborted) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordPublicationCancelled(durationMs);
        return EventResultFactory.createPublishCancelled(
          snapshotEvent.type,
          context.executionId,
          durationMs,
          [],
        );
      }

      let handlerResults: EventHandlerResult[] = [];
      let executionError: unknown;

      const executor = mode === 'CONCURRENT' ? this._concurrentExecutor : this._sequentialExecutor;

      try {
        handlerResults = await executor.execute(
          snapshotEvent,
          handlers,
          context,
          failureStrategy,
          this._executionEngine,
          this._interceptorEngine,
          this._diagnostics,
        );
      } catch (err: unknown) {
        executionError = err;
      }

      const durationMs = Math.round(profiler.elapsedMs * 100) / 100;

      if (
        context.signal.aborted ||
        executionError instanceof EventCancellationError ||
        executionError instanceof ExecutionCancellationError
      ) {
        context.cancel();
        this._diagnostics.recordPublicationCancelled(durationMs);
        return EventResultFactory.createPublishCancelled(
          snapshotEvent.type,
          context.executionId,
          durationMs,
          handlerResults,
        );
      }

      const hasFailedHandler = handlerResults.some((r) => !r.success);

      if (executionError || hasFailedHandler) {
        context.fail();
        this._diagnostics.recordPublicationFailed(durationMs);
        return EventResultFactory.createPublishFailed(
          snapshotEvent.type,
          context.executionId,
          durationMs,
          handlerResults,
        );
      }

      context.complete();
      this._diagnostics.recordPublicationCompleted(durationMs);
      return EventResultFactory.createPublishCompleted(
        snapshotEvent.type,
        context.executionId,
        durationMs,
        handlerResults,
      );
    });
  }

  public getDiagnostics(): EventDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
