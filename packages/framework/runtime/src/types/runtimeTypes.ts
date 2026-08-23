import {
  ErrorDescriptor,
  ResponseDescriptor,
  RuntimeApplication,
  RuntimeSnapshot,
  RuntimeState,
} from '@coreforge/contracts';

export type {
  ErrorDescriptor,
  ResponseDescriptor,
  RuntimeApplication,
  RuntimeSnapshot,
  RuntimeState,
};

export type BootstrapStage =
  | 'VALIDATION'
  | 'METADATA'
  | 'DISCOVERY'
  | 'DI'
  | 'REQUEST_CONTEXT'
  | 'PARAMETER_BINDING'
  | 'ROUTING'
  | 'EXECUTION'
  | 'RESPONSE'
  | 'EXCEPTIONS'
  | 'TRANSPORT'
  | 'COMPILING'
  | 'INITIALIZING';

export interface BootstrapOptions {
  readonly failFast?: boolean | undefined;
}

export interface ShutdownOptions {
  readonly timeoutMs?: number | undefined;
  readonly force?: boolean | undefined;
}

export interface RuntimeOptions {
  shutdownTimeoutMs?: number | undefined;
  enableDiagnostics?: boolean | undefined;
  enableSignalHandlers?: boolean | undefined;
  failFast?: boolean | undefined;
  environment?: string | undefined;
}

export interface RuntimeStatus {
  readonly state: RuntimeState;
  readonly startedAt: number;
  readonly stoppedAt?: number | undefined;
  readonly processId: number;
  readonly uptime?: number | undefined;
  readonly nodeVersion?: string | undefined;
  readonly frameworkVersion?: string | undefined;
}

export interface RuntimePipelineResult {
  readonly status: number;
  readonly success: boolean;
  readonly responseDescriptor?: ResponseDescriptor | undefined;
  readonly errorDescriptor?: ErrorDescriptor | undefined;
  readonly durationMs: number;
  readonly routeId?: string | undefined;
  readonly correlationId?: string | undefined;
}

export interface RuntimeDiagnosticsSnapshot {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly activeRequests: number;
  readonly startupDurationMs: number;
  readonly shutdownDurationMs: number;
  readonly averageRequestDurationMs: number;
  readonly slowestRequestDurationMs: number;
  readonly startupFailures: number;
  readonly routingFailures: number;
  readonly executionFailures: number;
  readonly responseFailures: number;
  readonly exceptionFailures: number;
  readonly transportFailures: number;
  readonly state: RuntimeState;
  readonly startedAt?: number | undefined;
  readonly stoppedAt?: number | undefined;
  readonly timestamp: number;
}
