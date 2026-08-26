import {
  ExecutionContext,
  ExecutionEngine as IExecutionEngine,
  ExecutionEngineDiagnosticsSnapshot,
  ExecutionHandler,
  ExecutionMiddleware,
  ExecutionOptions,
  ExecutionResult,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

export type {
  ExecutionContext,
  IExecutionEngine,
  ExecutionEngineDiagnosticsSnapshot,
  ExecutionHandler,
  ExecutionMiddleware,
  ExecutionOptions,
  ExecutionResult,
};

export type ExecutionEngineState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface ExecutionEngineOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly autoStart?: boolean | undefined;
}
