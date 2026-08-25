import { TraceContext, TraceProvider, TraceStartOptions } from '@coreforge/contracts';

import { Span } from './Span';
import { TraceContextManager } from '../context/TraceContextManager';
import { TraceDiagnostics } from '../diagnostics/TraceDiagnostics';
import { TraceLimitsManager } from '../limits/TraceLimitsManager';
import { TraceSampler } from '../sampling/TraceSampler';

export class SpanFactory {
  private readonly _contextManager: TraceContextManager;
  private readonly _sampler: TraceSampler;
  private readonly _limits: TraceLimitsManager;
  private readonly _provider: TraceProvider;
  private readonly _diagnostics: TraceDiagnostics;

  constructor(
    contextManager: TraceContextManager,
    sampler: TraceSampler,
    limits: TraceLimitsManager,
    provider: TraceProvider,
    diagnostics: TraceDiagnostics,
  ) {
    this._contextManager = contextManager;
    this._sampler = sampler;
    this._limits = limits;
    this._provider = provider;
    this._diagnostics = diagnostics;
  }

  public createRootSpan(name: string, options?: TraceStartOptions): Span {
    const sampled = this._sampler.shouldSample(options?.sampled);
    const context = this._contextManager.createRootContext(sampled);
    const span = new Span(context, name, this._limits, this._provider, this._diagnostics);

    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    this._diagnostics.recordTraceStarted();
    return span;
  }

  public createChildSpan(name: string, parentContext: TraceContext): Span {
    const context = this._contextManager.createChildContext(parentContext);
    return new Span(context, name, this._limits, this._provider, this._diagnostics);
  }
}
