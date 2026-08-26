import {
  ApplicationError,
  ApplicationErrorCategory,
  ErrorHandler,
  ErrorHandlerAction,
  ErrorHandlerOptions,
  ErrorHandlerResult,
  ErrorHandlingDiagnosticsSnapshot,
  ErrorHandlingEngine as IErrorHandlingEngine,
  ErrorProcessingOptions,
  ErrorProcessingResult,
  ErrorProcessingState,
  ExecutionContext,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

export type {
  ApplicationError,
  ApplicationErrorCategory,
  ErrorHandler,
  ErrorHandlerAction,
  ErrorHandlerOptions,
  ErrorHandlerResult,
  ErrorHandlingDiagnosticsSnapshot,
  ErrorProcessingOptions,
  ErrorProcessingResult,
  ErrorProcessingState,
  ExecutionContext,
  IErrorHandlingEngine,
};

export type ErrorHandlingState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface ErrorHandlingConfig {
  readonly includeStackDefault?: boolean | undefined;
  readonly maxCauseDepthDefault?: number | undefined;
  readonly autoStart?: boolean | undefined;
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly sensitiveKeys?: readonly string[] | undefined;
}

export interface RegisteredErrorHandlerEntry<TError = unknown, TResult = unknown> {
  readonly id: string;
  readonly handler: ErrorHandler<TError, TResult>;
  readonly priority: number;
  readonly sequence: number;
  readonly category?: ApplicationErrorCategory | undefined;
  readonly code?: string | undefined;
}
