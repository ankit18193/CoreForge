import {
  Command,
  CommandHandler,
  DispatchDiagnosticsSnapshot,
  Dispatcher as IDispatcher,
  DispatchOptions,
  DispatchResult,
  ExecutionContext,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

export type {
  Command,
  CommandHandler,
  DispatchDiagnosticsSnapshot,
  IDispatcher,
  DispatchOptions,
  DispatchResult,
  ExecutionContext,
};

export type DispatchState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface DispatcherOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly interceptorEngine?: InterceptorEngine | undefined;
  readonly autoStart?: boolean | undefined;
}
