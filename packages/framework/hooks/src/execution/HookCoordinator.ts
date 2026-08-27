import { HookExecutor } from './HookExecutor';
import { HookDiagnostics } from '../diagnostics/HookDiagnostics';
import { HookExecutionError, HookLifecycleError } from '../errors/HookErrors';
import { HookProfiler } from '../internal/HookProfiler';
import { HookRegistry } from '../registry/HookRegistry';
import { HookResolver } from '../registry/HookResolver';
import { HookResultFactory } from '../result/HookResultFactory';
import {
  ExecutionContext,
  HookBatchResult,
  HookDispatchOptions,
  HookExecutionResult,
  HookFailureStrategy,
  HookType,
  RegisteredHookEntry,
} from '../types/hookTypes';

export class HookCoordinator {
  public static async executeBatch<TPayload = unknown, TResult = unknown>(
    registry: HookRegistry,
    type: HookType,
    payload: TPayload,
    diagnostics: HookDiagnostics,
    options?: HookDispatchOptions,
    defaultStrategy: HookFailureStrategy = 'CONTINUE',
  ): Promise<HookBatchResult<TResult>> {
    const profiler = new HookProfiler().start();
    const resolvedHooks = HookResolver.resolveExecutionOrder(registry, type);

    if (resolvedHooks.length === 0) {
      return HookResultFactory.createBatchResult<TResult>({
        type,
        results: [],
        durationMs: profiler.elapsedMs,
      });
    }

    const results: HookExecutionResult<TResult>[] = [];
    const context: ExecutionContext | undefined = options?.context;
    const batchStrategy = options?.failureStrategy;

    let stopExecution = false;

    for (let i = 0; i < resolvedHooks.length; i++) {
      const entry = resolvedHooks[i];

      if (stopExecution) {
        diagnostics.recordHookSkipped(type);
        results.push(
          HookResultFactory.createSingleResult<TResult>({
            hookId: entry.id,
            type: entry.type,
            state: 'SKIPPED',
            success: false,
            durationMs: 0,
          }),
        );
        continue;
      }

      const effectiveStrategy: HookFailureStrategy =
        batchStrategy ?? entry.failureStrategy ?? defaultStrategy;

      const singleResult = await HookExecutor.executeSingle<TPayload, TResult>(
        entry as unknown as RegisteredHookEntry<TPayload, TResult>,
        payload,
        context,
        diagnostics,
        options?.timeoutMs,
      );

      results.push(singleResult);

      if (!singleResult.success && singleResult.state !== 'SKIPPED') {
        if (effectiveStrategy === 'FAIL_FAST') {
          // If lifecycle hook, throw HookLifecycleError; otherwise HookExecutionError
          const isLifecycle =
            type === 'BEFORE_START' ||
            type === 'AFTER_START' ||
            type === 'BEFORE_STOP' ||
            type === 'AFTER_STOP';

          const errorMsg = `Hook "${entry.id}" (${type}) failed with FAIL_FAST strategy`;
          if (isLifecycle) {
            throw new HookLifecycleError(errorMsg, {
              hookId: entry.id,
              type,
              error: singleResult.error,
            });
          } else {
            throw new HookExecutionError(errorMsg, {
              hookId: entry.id,
              type,
              error: singleResult.error,
            });
          }
        } else if (effectiveStrategy === 'STOP') {
          stopExecution = true;
        }
      }
    }

    return HookResultFactory.createBatchResult<TResult>({
      type,
      results,
      durationMs: profiler.elapsedMs,
    });
  }
}
