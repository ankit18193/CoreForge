import {
  Span as ISpan,
  SpanEvent,
  SpanLink,
  SpanSnapshot,
  SpanState,
  SpanStatus,
  TraceContext as ITraceContext,
  TraceDiagnosticsSnapshot,
  TraceManager as ITraceManager,
  TraceProvider,
  TraceSnapshot,
  TraceStartOptions,
} from '@coreforge/contracts';

export type {
  ISpan,
  SpanEvent,
  SpanLink,
  SpanSnapshot,
  SpanState,
  SpanStatus,
  ITraceContext,
  TraceDiagnosticsSnapshot,
  ITraceManager,
  TraceProvider,
  TraceSnapshot,
  TraceStartOptions,
};

export type TraceSamplerType = 'ALWAYS' | 'NEVER' | 'PROBABILISTIC';

export interface TraceSamplerConfig {
  readonly type: TraceSamplerType;
  readonly probability?: number | undefined;
}

export interface TraceLimitsConfig {
  readonly maxAttributesPerSpan?: number | undefined;
  readonly maxEventsPerSpan?: number | undefined;
  readonly maxLinksPerSpan?: number | undefined;
  readonly maxAttributeValueLength?: number | undefined;
}

export interface TracingOptions {
  readonly sampler?: TraceSamplerConfig | undefined;
  readonly limits?: TraceLimitsConfig | undefined;
  readonly maxStoredTraces?: number | undefined;
  readonly maxStoredSpansPerTrace?: number | undefined;
  readonly autoStart?: boolean | undefined;
}

export type TraceState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';
