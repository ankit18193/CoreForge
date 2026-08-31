import type {
  HttpMiddlewareBatchResult,
  HttpMiddlewareContext,
  HttpMiddlewareResult,
} from '@coreforge/contracts';

import { HttpMiddlewareSnapshot } from './HttpMiddlewareSnapshot';
import { HttpMiddlewareDiagnostics } from '../diagnostics/HttpMiddlewareDiagnostics';
import {
  HttpMiddlewareCancellationError,
  HttpMiddlewareExecutionError,
  HttpMiddlewareTimeoutError,
} from '../errors/HttpMiddlewareErrors';
import { HttpMiddlewareProfiler } from '../internal/HttpMiddlewareProfiler';
import { RegisteredMiddlewareEntry } from '../types/httpMiddlewareTypes';

export interface HttpMiddlewareExecutionOutcome<TResult = unknown> {
  readonly result: TResult;
  readonly batch: Readonly<HttpMiddlewareBatchResult<TResult>>;
}

export class HttpMiddlewareExecutor {
  private readonly _diagnostics: HttpMiddlewareDiagnostics;

  constructor(diagnostics: HttpMiddlewareDiagnostics) {
    this._diagnostics = diagnostics;
  }

  public async execute<TReq = unknown, TResult = unknown>(
    context: HttpMiddlewareContext<TReq>,
    entries: readonly RegisteredMiddlewareEntry[],
    target: (ctx: HttpMiddlewareContext<TReq>) => Promise<TResult>,
    defaultTimeoutMs?: number,
  ): Promise<HttpMiddlewareExecutionOutcome<TResult>> {
    const pipelineProfiler = new HttpMiddlewareProfiler().start();
    const results: HttpMiddlewareResult<TResult>[] = new Array(entries.length);
    const totalMiddleware = entries.length;

    let executedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let cancelledCount = 0;

    const executeIndex = async (index: number): Promise<TResult> => {
      // Base case: all middleware executed, invoke terminal target
      if (index >= entries.length) {
        if (context.executionContext.signal.aborted) {
          throw new HttpMiddlewareCancellationError(
            'HTTP request was cancelled before target execution',
          );
        }
        return target(context);
      }

      const entry = entries[index];

      // Check for cancellation before entering middleware
      if (context.executionContext.signal.aborted) {
        cancelledCount++;
        const cancelErr = new HttpMiddlewareCancellationError(
          `Middleware '${entry.middleware.id}' was cancelled before execution`,
          entry.middleware.id,
        );
        results[index] = {
          middlewareId: entry.middleware.id,
          state: 'CANCELLED',
          success: false,
          error: cancelErr,
          durationMs: 0,
        };
        this._diagnostics.recordExecutionFailure(0, true);
        throw cancelErr;
      }

      const mwProfiler = new HttpMiddlewareProfiler().start();
      this._diagnostics.recordExecutionStarted();
      executedCount++;

      let nextCalled = false;
      let mwOutcome: TResult;

      const next = async (): Promise<TResult> => {
        if (nextCalled) {
          throw new HttpMiddlewareExecutionError(
            `next() was called multiple times in middleware '${entry.middleware.id}'`,
            entry.middleware.id,
          );
        }
        nextCalled = true;
        return executeIndex(index + 1);
      };

      const timeoutMs = entry.timeoutMs ?? defaultTimeoutMs;

      try {
        if (timeoutMs && timeoutMs > 0) {
          let timerId: NodeJS.Timeout | undefined;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timerId = setTimeout(() => {
              reject(
                new HttpMiddlewareTimeoutError(
                  `Middleware '${entry.middleware.id}' execution timed out after ${timeoutMs}ms`,
                  entry.middleware.id,
                  timeoutMs,
                ),
              );
            }, timeoutMs);
          });

          try {
            mwOutcome = await Promise.race([
              Promise.resolve(
                entry.middleware.execute(
                  context as unknown as HttpMiddlewareContext,
                  next,
                ) as Promise<TResult>,
              ),
              timeoutPromise,
            ]);
          } finally {
            if (timerId) {
              clearTimeout(timerId);
            }
          }
        } else {
          mwOutcome = await Promise.resolve(
            entry.middleware.execute(
              context as unknown as HttpMiddlewareContext,
              next,
            ) as Promise<TResult>,
          );
        }

        // Post-execution cancellation check
        if (context.executionContext.signal.aborted) {
          const durationMs = mwProfiler.stop();
          cancelledCount++;
          const cancelErr = new HttpMiddlewareCancellationError(
            `Middleware '${entry.middleware.id}' was cancelled during unwinding`,
            entry.middleware.id,
          );
          results[index] = {
            middlewareId: entry.middleware.id,
            state: 'CANCELLED',
            success: false,
            error: cancelErr,
            durationMs,
          };
          this._diagnostics.recordExecutionFailure(durationMs, true);
          throw cancelErr;
        }

        const durationMs = mwProfiler.stop();
        this._diagnostics.recordExecutionSuccess(durationMs);
        results[index] = {
          middlewareId: entry.middleware.id,
          state: 'COMPLETED',
          success: true,
          value: mwOutcome,
          durationMs,
        };

        return mwOutcome;
      } catch (err: unknown) {
        const durationMs = mwProfiler.stop();
        const isCancelled =
          err instanceof HttpMiddlewareCancellationError ||
          (typeof err === 'object' &&
            err !== null &&
            (err as { name?: string }).name === 'AbortError');

        if (isCancelled) {
          cancelledCount++;
          this._diagnostics.recordExecutionFailure(durationMs, true);
          results[index] = {
            middlewareId: entry.middleware.id,
            state: 'CANCELLED',
            success: false,
            error: err,
            durationMs,
          };
          throw err;
        }

        failedCount++;
        this._diagnostics.recordExecutionFailure(durationMs, false);
        results[index] = {
          middlewareId: entry.middleware.id,
          state: 'FAILED',
          success: false,
          error: err,
          durationMs,
        };

        // Failure Strategy Handling
        if (entry.failureStrategy === 'CONTINUE' && !nextCalled) {
          // Failure occurred before calling next().
          // CONTINUE strategy isolates this failure and continues with the next middleware in the chain.
          return executeIndex(index + 1);
        }

        if (entry.failureStrategy === 'STOP') {
          // Mark remaining un-entered middleware as SKIPPED
          for (let s = index + 1; s < entries.length; s++) {
            skippedCount++;
            this._diagnostics.recordExecutionSkipped();
            results[s] = {
              middlewareId: entries[s].middleware.id,
              state: 'SKIPPED',
              success: false,
              durationMs: 0,
            };
          }
        }

        if (
          err instanceof HttpMiddlewareExecutionError ||
          err instanceof HttpMiddlewareTimeoutError
        ) {
          throw err;
        }

        throw new HttpMiddlewareExecutionError(
          `Middleware '${entry.middleware.id}' failed during execution: ${err instanceof Error ? err.message : String(err)}`,
          entry.middleware.id,
          err instanceof Error ? err : undefined,
        );
      }
    };

    let executionResult: TResult;
    try {
      executionResult = await executeIndex(0);
    } catch (pipelineErr: unknown) {
      const totalPipelineDurationMs = pipelineProfiler.stop();
      const filteredResults = results.filter(Boolean);
      const batchResult: HttpMiddlewareBatchResult<TResult> = {
        success: false,
        results: filteredResults,
        totalMiddleware,
        executedMiddleware: executedCount,
        failedMiddleware: failedCount,
        skippedMiddleware: skippedCount,
        cancelledMiddleware: cancelledCount,
        durationMs: totalPipelineDurationMs,
      };

      const frozenBatch = HttpMiddlewareSnapshot.createBatchResult(batchResult);
      // Re-throw the pipeline error with batch details attached
      (pipelineErr as { batch?: unknown }).batch = frozenBatch;
      throw pipelineErr;
    }

    const totalPipelineDurationMs = pipelineProfiler.stop();
    const filteredResults = results.filter(Boolean);
    const batchResult: HttpMiddlewareBatchResult<TResult> = {
      success: failedCount === 0 && cancelledCount === 0,
      results: filteredResults,
      totalMiddleware,
      executedMiddleware: executedCount,
      failedMiddleware: failedCount,
      skippedMiddleware: skippedCount,
      cancelledMiddleware: cancelledCount,
      durationMs: totalPipelineDurationMs,
    };

    const frozenBatch = HttpMiddlewareSnapshot.createBatchResult(batchResult);

    return Object.freeze({
      result: executionResult,
      batch: frozenBatch,
    });
  }
}
