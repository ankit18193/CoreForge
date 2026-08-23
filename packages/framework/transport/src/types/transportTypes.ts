import {
  NormalizedRequest,
  RequestContext,
  ResponseDescriptor,
  TransportAdapter,
  TransportRequest,
  TransportRequestNormalizer,
  TransportResponse,
  TransportResponseWriter,
} from '@coreforge/contracts';

export type {
  NormalizedRequest,
  RequestContext,
  ResponseDescriptor,
  TransportAdapter,
  TransportRequest,
  TransportRequestNormalizer,
  TransportResponse,
  TransportResponseWriter,
};

export interface TransportExecutionOptions {
  readonly timeoutMs?: number | undefined;
  readonly correlationId?: string | undefined;
  readonly traceId?: string | undefined;
  readonly abortSignal?: AbortSignal | undefined;
}

export interface TransportAdapterOptions {
  readonly allowOverride?: boolean | undefined;
  readonly enableDiagnostics?: boolean | undefined;
}

export interface TransportPipelineResult {
  readonly descriptor: ResponseDescriptor;
  readonly durationMs: number;
  readonly success: boolean;
}

export interface TransportDiagnosticsSnapshot {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly abortedRequests: number;
  readonly normalizationFailures: number;
  readonly responseWriteFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly statusDistribution: Readonly<Record<number, number>>;
  readonly timestamp: number;
}
