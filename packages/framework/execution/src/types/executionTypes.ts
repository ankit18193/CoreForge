import {
  ActionDescriptor,
  ExecutionActionInvoker,
  ExecutionContext,
  ExecutionEngine,
  ExecutionResult,
  InjectionToken,
  ParameterBindingDescriptor,
  RequestContext,
} from '@coreforge/contracts';

export type ActionInvoker = ExecutionActionInvoker;

export type {
  ActionDescriptor,
  ExecutionContext,
  ExecutionEngine,
  ExecutionResult,
  InjectionToken,
  ParameterBindingDescriptor,
  RequestContext,
};

export interface Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export interface Middleware {
  handle(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}

export interface Interceptor {
  intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}

export interface ActionInvocation {
  readonly action: ActionDescriptor;
  readonly controller: unknown;
  readonly arguments: readonly unknown[];
}

export interface ExecutionDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly guardRejections: number;
  readonly middlewareFailures: number;
  readonly interceptorFailures: number;
  readonly actionFailures: number;
  readonly totalDurationMs: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly timestamp: number;
}
