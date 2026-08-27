import {
  ExecutionContext,
  Hook,
  HookBatchResult,
  HookDiagnosticsSnapshot,
  HookDispatchOptions,
  HookExecutionContext,
  HookExecutionResult,
  HookFailureStrategy,
  HookManager as IHookManager,
  HookOptions,
  HookState,
  HookType,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

export type {
  ExecutionContext,
  Hook,
  HookBatchResult,
  HookDiagnosticsSnapshot,
  HookDispatchOptions,
  HookExecutionContext,
  HookExecutionResult,
  HookFailureStrategy,
  HookOptions,
  HookState,
  HookType,
  IHookManager,
};

export interface RegisteredHookEntry<TPayload = unknown, TResult = unknown> {
  readonly id: string;
  readonly type: HookType;
  readonly hook: Hook<TPayload, TResult>;
  readonly priority: number;
  readonly sequence: number;
  readonly failureStrategy: HookFailureStrategy;
}

export interface HookManagerConfig {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly autoStart?: boolean | undefined;
  readonly defaultFailureStrategy?: HookFailureStrategy | undefined;
  readonly defaultTimeoutMs?: number | undefined;
}
