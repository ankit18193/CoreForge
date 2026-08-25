import {
  Span as ISpan,
  SpanSnapshot,
  SpanState,
  SpanStatus,
  TraceContext,
  TraceProvider,
} from '@coreforge/contracts';

import { SpanAttributes } from './SpanAttributes';
import { SpanEvents } from './SpanEvents';
import { SpanLinks } from './SpanLinks';
import { TraceDiagnostics } from '../diagnostics/TraceDiagnostics';
import { SpanLifecycleError, SpanNameError, TraceLimitError } from '../errors/TracingErrors';
import { TraceProfiler } from '../internal/TraceProfiler';
import { TraceLimitsManager } from '../limits/TraceLimitsManager';

export class Span implements ISpan {
  private readonly _context: TraceContext;
  private readonly _name: string;
  private readonly _startTime: number;
  private _endTime?: number | undefined;
  private _durationMs?: number | undefined;
  private _state: SpanState = 'RUNNING';
  private _status: SpanStatus = 'UNSET';
  private _ended = false;

  private readonly _attributes: SpanAttributes;
  private readonly _events: SpanEvents;
  private readonly _links: SpanLinks;
  private readonly _provider: TraceProvider;
  private readonly _diagnostics: TraceDiagnostics;
  private readonly _profiler: TraceProfiler;

  constructor(
    context: TraceContext,
    name: string,
    limits: TraceLimitsManager,
    provider: TraceProvider,
    diagnostics: TraceDiagnostics,
  ) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new SpanNameError('Span name must be a non-empty string', { name });
    }

    this._context = context;
    this._name = name.trim();
    this._startTime = Date.now();
    this._profiler = new TraceProfiler().start();

    this._attributes = new SpanAttributes(limits);
    this._events = new SpanEvents(limits);
    this._links = new SpanLinks(limits);
    this._provider = provider;
    this._diagnostics = diagnostics;

    this._diagnostics.recordSpanStarted();
  }

  public get context(): TraceContext {
    return this._context;
  }

  public get ended(): boolean {
    return this._ended;
  }

  public setAttribute(key: string, value: unknown): this {
    if (this._ended) {
      throw new SpanLifecycleError('Cannot set attribute on an ended span', {
        spanId: this._context.spanId,
      });
    }

    try {
      this._attributes.set(key, value);
    } catch (err: unknown) {
      if (err instanceof TraceLimitError) {
        this._diagnostics.recordAttributeLimitRejection();
      }
      throw err;
    }

    return this;
  }

  public setAttributes(attributes: Readonly<Record<string, unknown>>): this {
    if (this._ended) {
      throw new SpanLifecycleError('Cannot set attributes on an ended span', {
        spanId: this._context.spanId,
      });
    }

    try {
      this._attributes.setMultiple(attributes as Record<string, unknown>);
    } catch (err: unknown) {
      if (err instanceof TraceLimitError) {
        this._diagnostics.recordAttributeLimitRejection();
      }
      throw err;
    }

    return this;
  }

  public addEvent(name: string, attributes?: Readonly<Record<string, unknown>>): this {
    if (this._ended) {
      throw new SpanLifecycleError('Cannot add event to an ended span', {
        spanId: this._context.spanId,
      });
    }

    try {
      this._events.add(name, attributes);
    } catch (err: unknown) {
      if (err instanceof TraceLimitError) {
        this._diagnostics.recordEventLimitRejection();
      }
      throw err;
    }

    return this;
  }

  public addLink(context: TraceContext, attributes?: Readonly<Record<string, unknown>>): this {
    if (this._ended) {
      throw new SpanLifecycleError('Cannot add link to an ended span', {
        spanId: this._context.spanId,
      });
    }

    try {
      this._links.add(context, attributes);
    } catch (err: unknown) {
      if (err instanceof TraceLimitError) {
        this._diagnostics.recordLinkLimitRejection();
      }
      throw err;
    }

    return this;
  }

  public setStatus(status: SpanStatus): this {
    if (this._ended) {
      throw new SpanLifecycleError('Cannot set status on an ended span', {
        spanId: this._context.spanId,
      });
    }

    this._status = status;
    return this;
  }

  public end(status?: SpanStatus): void {
    if (this._ended) {
      return; // Idempotent
    }

    this._ended = true;
    this._endTime = Date.now();
    this._durationMs = Math.round(this._profiler.elapsedMs * 100) / 100;

    if (status) {
      this._status = status;
    }

    if (this._status === 'ERROR') {
      this._state = 'FAILED';
      this._diagnostics.recordSpanFailed(this._durationMs);
    } else if (this._status === 'CANCELLED') {
      this._state = 'CANCELLED';
      this._diagnostics.recordSpanCancelled(this._durationMs);
    } else {
      this._state = 'COMPLETED';
      this._diagnostics.recordSpanCompleted(this._durationMs);
    }

    const snap = this.snapshot();

    // Provider recording is isolated: never throws to the caller
    try {
      const recordPromise = this._provider.record(snap);
      if (recordPromise && typeof recordPromise.catch === 'function') {
        recordPromise.catch(() => {
          this._diagnostics.recordProviderFailure();
        });
      }
    } catch {
      this._diagnostics.recordProviderFailure();
    }
  }

  public snapshot(): SpanSnapshot {
    return Object.freeze({
      traceId: this._context.traceId,
      spanId: this._context.spanId,
      parentSpanId: this._context.parentSpanId,
      name: this._name,
      state: this._state,
      status: this._status,
      sampled: this._context.sampled,
      startTime: this._startTime,
      endTime: this._endTime,
      durationMs: this._durationMs,
      attributes: this._attributes.getSnapshot(),
      events: this._events.getSnapshot(),
      links: this._links.getSnapshot(),
    });
  }
}
