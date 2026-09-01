import {
  ExecutionContext,
  HttpPublicError,
  HttpErrorMapper,
  HttpErrorMapperRegistrationOptions,
  HttpErrorMappingContext,
  HttpErrorMappingDiagnosticsSnapshot,
  HttpErrorMappingResult,
} from '@coreforge/contracts';

export type {
  HttpPublicError,
  HttpErrorMapper as IHttpErrorMapper,
  HttpErrorMapperRegistrationOptions,
  HttpErrorMappingContext,
  HttpErrorMappingDiagnosticsSnapshot,
  HttpErrorMappingResult,
};

export type HttpErrorConstructor =
  (new (...args: never[]) => Error) | (abstract new (...args: never[]) => Error);

export type HttpErrorPredicate = (error: unknown) => boolean;

export interface HttpErrorMapperEntry<TError = unknown> {
  readonly id: string;
  readonly mapper: HttpErrorMapper<TError>;
  readonly priority: number;
  readonly sequence: number;
  readonly code?: string | undefined;
  readonly errorType?: HttpErrorConstructor | undefined;
  readonly predicate?: HttpErrorPredicate | undefined;
}

export interface HttpErrorMappingConfig {
  readonly includeErrorDetails?: boolean | undefined;
  readonly cancellationStatus?: number | undefined;
  readonly customStatusMap?: Record<string, number> | undefined;
  readonly sensitiveKeys?: readonly string[] | undefined;
}

export interface SanitizedErrorContextParams {
  readonly requestId?: string | undefined;
  readonly method?: string | undefined;
  readonly url?: string | undefined;
  readonly path?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly executionContext?: ExecutionContext | undefined;
}
