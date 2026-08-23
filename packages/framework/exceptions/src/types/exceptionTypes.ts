import {
  ErrorCategory,
  ErrorCauseDescriptor,
  ErrorDescriptor,
  ExceptionContext,
  ExceptionHandler,
  ExceptionPipeline,
  RequestContext,
} from '@coreforge/contracts';

export type {
  ErrorCategory,
  ErrorCauseDescriptor,
  ErrorDescriptor,
  ExceptionContext,
  ExceptionHandler,
  ExceptionPipeline,
  RequestContext,
};

export interface ExceptionPipelineOptions {
  readonly exposeStack?: boolean | undefined;
  readonly defaultStatus?: number | undefined;
  readonly defaultCode?: string | undefined;
}

export interface ErrorClassification {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly status: number;
}

export interface ExceptionDiagnosticsSnapshot {
  readonly total: number;
  readonly handled: number;
  readonly fallback: number;
  readonly handlerFailures: number;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly byCode: Readonly<Record<string, number>>;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly timestamp: number;
}
