import {
  ExecutionContext,
  Interceptor,
  InterceptorDiagnosticsSnapshot,
  InterceptorEngine as IInterceptorEngine,
  InterceptorOptions,
  InterceptorResult,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

export type {
  ExecutionContext,
  Interceptor,
  InterceptorDiagnosticsSnapshot,
  IInterceptorEngine,
  InterceptorOptions,
  InterceptorResult,
};

export type InterceptorState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface InterceptorEngineOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly autoStart?: boolean | undefined;
}
