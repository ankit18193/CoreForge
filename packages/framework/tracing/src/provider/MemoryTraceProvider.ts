import { SpanSnapshot, TraceProvider } from '@coreforge/contracts';

import { TracingConfigurationError } from '../errors/TracingErrors';

export class MemoryTraceProvider implements TraceProvider {
  private readonly _maxStoredTraces: number;
  private readonly _maxStoredSpansPerTrace: number;
  private readonly _spansByTrace = new Map<string, SpanSnapshot[]>();
  private readonly _traceOrder: string[] = [];

  constructor(
    options: {
      maxStoredTraces?: number | undefined;
      maxStoredSpansPerTrace?: number | undefined;
    } = {},
  ) {
    const maxTraces = options.maxStoredTraces ?? 1000;
    const maxSpans = options.maxStoredSpansPerTrace ?? 100;

    if (maxTraces <= 0 || !Number.isFinite(maxTraces)) {
      throw new TracingConfigurationError('maxStoredTraces must be a positive integer', {
        maxStoredTraces: maxTraces,
      });
    }
    if (maxSpans <= 0 || !Number.isFinite(maxSpans)) {
      throw new TracingConfigurationError('maxStoredSpansPerTrace must be a positive integer', {
        maxStoredSpansPerTrace: maxSpans,
      });
    }

    this._maxStoredTraces = Math.floor(maxTraces);
    this._maxStoredSpansPerTrace = Math.floor(maxSpans);
  }

  public get maxStoredTraces(): number {
    return this._maxStoredTraces;
  }

  public get maxStoredSpansPerTrace(): number {
    return this._maxStoredSpansPerTrace;
  }

  public async record(span: SpanSnapshot): Promise<void> {
    if (!span.sampled) {
      return; // Do not retain unsampled spans
    }

    let spans = this._spansByTrace.get(span.traceId);
    if (!spans) {
      if (this._traceOrder.length >= this._maxStoredTraces) {
        const oldestTraceId = this._traceOrder.shift();
        if (oldestTraceId) {
          this._spansByTrace.delete(oldestTraceId);
        }
      }
      spans = [];
      this._spansByTrace.set(span.traceId, spans);
      this._traceOrder.push(span.traceId);
    }

    if (spans.length >= this._maxStoredSpansPerTrace) {
      spans.shift(); // Evict oldest span in trace
    }

    spans.push(span);
  }

  public async snapshot(traceId?: string): Promise<readonly SpanSnapshot[]> {
    if (traceId) {
      const spans = this._spansByTrace.get(traceId) ?? [];
      return Object.freeze([...spans]);
    }

    const allSpans: SpanSnapshot[] = [];
    for (const traceSpans of this._spansByTrace.values()) {
      allSpans.push(...traceSpans);
    }
    return Object.freeze(allSpans);
  }

  public async clear(): Promise<void> {
    this._spansByTrace.clear();
    this._traceOrder.length = 0;
  }
}
