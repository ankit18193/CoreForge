import { HookBatchResult, HookExecutionResult, HookType } from '../types/hookTypes';

export interface CreateHookExecutionResultParams<TResult = unknown> {
  readonly hookId: string;
  readonly type: HookType;
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED';
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown | undefined;
  readonly durationMs: number;
}

export interface CreateHookBatchResultParams<TResult = unknown> {
  readonly type: HookType;
  readonly results: readonly HookExecutionResult<TResult>[];
  readonly durationMs: number;
}

export class HookResultFactory {
  public static createSingleResult<TResult = unknown>(
    params: CreateHookExecutionResultParams<TResult>,
  ): HookExecutionResult<TResult> {
    return Object.freeze({
      hookId: params.hookId,
      type: params.type,
      state: params.state,
      success: params.success,
      value: params.value,
      error: params.error,
      durationMs: Math.round(params.durationMs * 100) / 100,
    });
  }

  public static createBatchResult<TResult = unknown>(
    params: CreateHookBatchResultParams<TResult>,
  ): HookBatchResult<TResult> {
    const results = Object.freeze([...params.results]);
    const totalHooks = results.length;
    let executedHooks = 0;
    let failedHooks = 0;
    let skippedHooks = 0;
    let cancelledHooks = 0;

    for (const r of results) {
      if (r.state === 'COMPLETED') {
        executedHooks++;
      } else if (r.state === 'FAILED') {
        failedHooks++;
      } else if (r.state === 'SKIPPED') {
        skippedHooks++;
      } else if (r.state === 'CANCELLED') {
        cancelledHooks++;
      }
    }

    const success = failedHooks === 0 && cancelledHooks === 0;

    return Object.freeze({
      type: params.type,
      success,
      results,
      totalHooks,
      executedHooks,
      failedHooks,
      skippedHooks,
      cancelledHooks,
      durationMs: Math.round(params.durationMs * 100) / 100,
    });
  }
}
