import {
  InjectionToken,
  RequestContext,
  RequestContextManager,
  RequestContextOptions,
  RequestScope,
} from '@coreforge/contracts';

export type {
  InjectionToken,
  RequestContext,
  RequestContextManager,
  RequestContextOptions,
  RequestScope,
};

export interface RequestContextSnapshot {
  readonly id: string;
  readonly correlationId: string;
  readonly traceId?: string | undefined;
  readonly startTime: number;
  readonly durationMs: number;
  readonly state: string;
  readonly isDisposed: boolean;
  readonly isCancelled: boolean;
  readonly isTimedOut: boolean;
  readonly attributeCount: number;
}

export interface RequestContextDiagnosticsSnapshot {
  readonly activeContextCount: number;
  readonly totalCreated: number;
  readonly totalCompleted: number;
  readonly totalTimedOut: number;
  readonly totalCancelled: number;
  readonly totalFailed: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly slowestContextId?: string | undefined;
  readonly timestamp: number;
}
