import type {
  HttpController,
  HttpControllerContext,
  HttpControllerResult,
  HttpControllerResultState,
} from '@coreforge/contracts';

import { HttpControllerSnapshot } from './HttpControllerSnapshot';
import { HttpControllerDiagnostics } from '../diagnostics/HttpControllerDiagnostics';
import {
  HttpControllerCancellationError,
  HttpControllerExecutionError,
  HttpControllerTimeoutError,
} from '../errors/HttpControllerErrors';
import { HttpControllerProfiler } from '../internal/HttpControllerProfiler';

export interface HttpControllerExecutionOptions {
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
}

export class HttpControllerExecutor {
  private readonly _diagnostics: HttpControllerDiagnostics;

  constructor(diagnostics: HttpControllerDiagnostics) {
    this._diagnostics = diagnostics;
  }

  public async execute<TReq = unknown, TResult = unknown>(
    controller: HttpController,
    context: HttpControllerContext<TReq>,
    options?: HttpControllerExecutionOptions,
  ): Promise<HttpControllerResult<TResult>> {
    const profiler = new HttpControllerProfiler().start();
    this._diagnostics.recordExecutionStarted();

    // Early cancellation check
    const signal = options?.signal ?? context.executionContext.signal;
    if (signal?.aborted) {
      this._diagnostics.recordExecutionCancelled(0);
      return HttpControllerSnapshot.createResult<TResult>(false, 'CANCELLED', 0, undefined, {});
    }

    const frozenContext = HttpControllerSnapshot.createContext<TReq>(context);

    try {
      let result: TResult;

      if (options?.timeoutMs !== undefined && options.timeoutMs > 0) {
        result = await this._executeWithTimeout<TReq, TResult>(
          controller,
          frozenContext,
          options.timeoutMs,
          signal,
        );
      } else {
        result = (await Promise.resolve(controller.execute(frozenContext))) as TResult;
      }

      // In-flight cancellation check
      if (signal?.aborted) {
        const durationMs = profiler.stop();
        this._diagnostics.recordExecutionCancelled(durationMs);
        return HttpControllerSnapshot.createResult<TResult>(false, 'CANCELLED', durationMs);
      }

      const durationMs = profiler.stop();
      this._diagnostics.recordExecutionSuccess(durationMs);
      return HttpControllerSnapshot.createResult<TResult>(true, 'COMPLETED', durationMs, result);
    } catch (err: unknown) {
      const durationMs = profiler.stop();

      const state: HttpControllerResultState = this._classifyError(err);

      if (state === 'CANCELLED') {
        this._diagnostics.recordExecutionCancelled(durationMs);
      } else {
        this._diagnostics.recordExecutionFailure(durationMs);
      }

      return HttpControllerSnapshot.createResult<TResult>(false, state, durationMs);
    }
  }

  private async _executeWithTimeout<TReq, TResult>(
    controller: HttpController,
    context: HttpControllerContext<TReq>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new HttpControllerTimeoutError(
            `Controller '${controller.id}' timed out after ${timeoutMs}ms`,
            controller.id,
            timeoutMs,
          ),
        );
      }, timeoutMs);

      const onAbort = () => {
        clearTimeout(timer);
        reject(
          new HttpControllerCancellationError(
            'Controller cancelled via AbortSignal',
            controller.id,
          ),
        );
      };

      if (signal?.aborted) {
        clearTimeout(timer);
        reject(
          new HttpControllerCancellationError('Controller cancelled before start', controller.id),
        );
        return;
      }

      signal?.addEventListener('abort', onAbort, { once: true });

      Promise.resolve(controller.execute(context))
        .then((res) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          resolve(res as TResult);
        })
        .catch((err: unknown) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          reject(
            err instanceof Error
              ? err
              : new HttpControllerExecutionError(String(err), controller.id),
          );
        });
    });
  }

  private _classifyError(err: unknown): HttpControllerResultState {
    if (
      err instanceof HttpControllerCancellationError ||
      (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError')
    ) {
      return 'CANCELLED';
    }
    if (err instanceof HttpControllerTimeoutError) {
      return 'FAILED';
    }
    return 'FAILED';
  }
}
