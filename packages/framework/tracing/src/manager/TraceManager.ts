import {
  TraceContext,
  TraceDiagnosticsSnapshot,
  TraceManager as ITraceManager,
  TraceProvider,
  TraceStartOptions,
} from '@coreforge/contracts';

import { TraceContextManager } from '../context/TraceContextManager';
import { TraceDiagnostics } from '../diagnostics/TraceDiagnostics';
import { TraceLifecycleManager } from '../lifecycle/TraceLifecycleManager';
import { TraceLimitsManager } from '../limits/TraceLimitsManager';
import { MemoryTraceProvider } from '../provider/MemoryTraceProvider';
import { TraceSampler } from '../sampling/TraceSampler';
import { Span } from '../span/Span';
import { SpanFactory } from '../span/SpanFactory';
import { TraceState, TracingOptions } from '../types/tracingTypes';

export class TraceManager implements ITraceManager {
  private readonly _lifecycle: TraceLifecycleManager;
  private readonly _contextManager: TraceContextManager;
  private readonly _sampler: TraceSampler;
  private readonly _limits: TraceLimitsManager;
  private readonly _provider: TraceProvider;
  private readonly _diagnostics: TraceDiagnostics;
  private readonly _spanFactory: SpanFactory;

  constructor(options: TracingOptions = {}, provider?: TraceProvider) {
    this._lifecycle = new TraceLifecycleManager();
    this._contextManager = new TraceContextManager();
    this._sampler = new TraceSampler(options.sampler);
    this._limits = new TraceLimitsManager(options.limits);
    this._diagnostics = new TraceDiagnostics();
    this._provider =
      provider ??
      new MemoryTraceProvider({
        maxStoredTraces: options.maxStoredTraces,
        maxStoredSpansPerTrace: options.maxStoredSpansPerTrace,
      });

    this._spanFactory = new SpanFactory(
      this._contextManager,
      this._sampler,
      this._limits,
      this._provider,
      this._diagnostics,
    );

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this._lifecycle.start();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): TraceState {
    return this._lifecycle.state;
  }

  public get provider(): TraceProvider {
    return this._provider;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._contextManager.disable();
    this._lifecycle.transitionToStopped();
  }

  public startTrace(name: string, options?: TraceStartOptions): Span {
    this._lifecycle.ensureCanStartSpan();
    return this._spanFactory.createRootSpan(name, options);
  }

  public startSpan(name: string, parent?: TraceContext): Span {
    this._lifecycle.ensureCanStartSpan();
    const parentContext = parent ?? this._contextManager.current();
    if (!parentContext) {
      return this._spanFactory.createRootSpan(name);
    }
    return this._spanFactory.createChildSpan(name, parentContext);
  }

  public async withContext<T>(context: TraceContext, fn: () => Promise<T> | T): Promise<T> {
    this._lifecycle.ensureOperational();
    return this._contextManager.withContext(context, fn);
  }

  public current(): TraceContext | undefined {
    return this._contextManager.current();
  }

  public getDiagnostics(): TraceDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
