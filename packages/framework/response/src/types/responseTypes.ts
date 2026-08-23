import {
  ResponseDescriptor,
  ResponseHeaders,
  ResponseProcessor,
  ResponseSerializationOptions,
  ResponseStatus,
} from '@coreforge/contracts';

export type {
  ResponseDescriptor,
  ResponseHeaders,
  ResponseProcessor,
  ResponseSerializationOptions,
  ResponseStatus,
};

export type SerializablePrimitive = string | number | boolean | bigint | null | undefined;

export interface NormalizedResult<T = unknown> {
  readonly status: ResponseStatus;
  readonly headers: Readonly<Record<string, string | readonly string[]>>;
  readonly contentType?: string | undefined;
  readonly body: T;
}

export interface SerializationOptions {
  readonly maxDepth?: number | undefined;
  readonly serializeDateAsIso?: boolean | undefined;
  readonly serializeBigIntAsString?: boolean | undefined;
}

export interface ResponseProcessingContext {
  readonly statusOverride?: ResponseStatus | undefined;
  readonly headersOverride?: Readonly<Record<string, string | readonly string[]>> | undefined;
  readonly contentTypeOverride?: string | undefined;
  readonly serializationOptions?: SerializationOptions | undefined;
}

export interface ResponseDiagnosticsSnapshot {
  readonly totalProcessed: number;
  readonly successfulProcessed: number;
  readonly serializationFailures: number;
  readonly circularFailures: number;
  readonly totalDurationMs: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly statusDistribution: Readonly<Record<number, number>>;
  readonly timestamp: number;
}
