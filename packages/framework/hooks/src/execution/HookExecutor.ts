import { HookDiagnostics } from '../diagnostics/HookDiagnostics';
import { HookCancellationError, HookTimeoutError } from '../errors/HookErrors';
import { HookProfiler } from '../internal/HookProfiler';
import { HookResultFactory } from '../result/HookResultFactory';
import { ExecutionContext, HookExecutionResult, RegisteredHookEntry } from '../types/hookTypes';

export class HookExecutor {
  public static async executeSingle<TPayload = unknown, TResult = unknown>(
    entry: RegisteredHookEntry<TPayload, TResult>,
    payload: TPayload,
    context: ExecutionContext | undefined,
    diagnostics: HookDiagnostics,
    timeoutMs?: number | undefined,
  ): Promise<HookExecutionResult<TResult>> {
    const profiler = new HookProfiler().start();
    diagnostics.recordHookStarted();

    if (context?.signal.aborted) {
      const durationMs = profiler.elapsedMs;
      diagnostics.recordHookCancelled(entry.type, durationMs);
      return HookResultFactory.createSingleResult<TResult>({
        hookId: entry.id,
        type: entry.type,
        state: 'CANCELLED',
        success: false,
        error: new HookCancellationError(
          `Hook "${entry.id}" execution cancelled before invocation`,
        ),
        durationMs,
      });
    }

    try {
      const hookPromise = Promise.resolve().then(() => entry.hook.execute(payload, context));

      let resultValue: TResult;
      if (timeoutMs && timeoutMs > 0) {
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new HookTimeoutError(`Hook "${entry.id}" timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        try {
          resultValue = (await Promise.race([hookPromise, timeoutPromise])) as TResult;
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      } else {
        resultValue = (await hookPromise) as TResult;
      }

      if (context?.signal.aborted) {
        const durationMs = profiler.elapsedMs;
        diagnostics.recordHookCancelled(entry.type, durationMs);
        return HookResultFactory.createSingleResult<TResult>({
          hookId: entry.id,
          type: entry.type,
          state: 'CANCELLED',
          success: false,
          error: new HookCancellationError(
            `Hook "${entry.id}" execution cancelled during invocation`,
          ),
          durationMs,
        });
      }

      const durationMs = profiler.elapsedMs;
      diagnostics.recordHookCompleted(entry.type, durationMs);
      return HookResultFactory.createSingleResult<TResult>({
        hookId: entry.id,
        type: entry.type,
        state: 'COMPLETED',
        success: true,
        value: resultValue,
        durationMs,
      });
    } catch (err: unknown) {
      const durationMs = profiler.elapsedMs;
      if (
        context?.signal.aborted ||
        err instanceof HookCancellationError ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        diagnostics.recordHookCancelled(entry.type, durationMs);
        return HookResultFactory.createSingleResult<TResult>({
          hookId: entry.id,
          type: entry.type,
          state: 'CANCELLED',
          success: false,
          error: err,
          durationMs,
        });
      }

      diagnostics.recordHookFailed(entry.type, durationMs);
      return HookResultFactory.createSingleResult<TResult>({
        hookId: entry.id,
        type: entry.type,
        state: 'FAILED',
        success: false,
        error: err,
        durationMs,
      });
    }
  }
}
