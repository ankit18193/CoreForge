import {
  BulkheadPolicy,
  CircuitBreakerPolicy,
  CircuitState,
  ResilienceDiagnosticsSnapshot,
  ResilienceExecutionOptions,
  ResilienceExecutor,
  ResilienceManager as IResilienceManager,
  ResilienceRetryPolicy,
  ResilienceTimeoutPolicy,
} from '@coreforge/contracts';

export type {
  BulkheadPolicy,
  CircuitBreakerPolicy,
  CircuitState,
  ResilienceDiagnosticsSnapshot,
  ResilienceExecutionOptions,
  ResilienceExecutor,
  IResilienceManager,
  ResilienceRetryPolicy,
  ResilienceTimeoutPolicy,
};

export type ResilienceState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface ResilienceOptions {
  readonly defaultOptions?: ResilienceExecutionOptions | undefined;
  readonly autoStart?: boolean | undefined;
}
