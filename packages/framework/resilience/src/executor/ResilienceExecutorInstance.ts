import { ResilienceExecutionOptions, ResilienceExecutor } from '@coreforge/contracts';

import { Bulkhead } from '../bulkhead/Bulkhead';
import { CircuitBreaker } from '../circuit/CircuitBreaker';
import { ResilienceDiagnostics } from '../diagnostics/ResilienceDiagnostics';
import {
  BulkheadRejectedError,
  CancellationError,
  CircuitOpenError,
  RetryExhaustedError,
  TimeoutError,
} from '../errors/ResilienceErrors';
import { FallbackExecutor } from '../fallback/FallbackExecutor';
import { ResilienceProfiler } from '../internal/ResilienceProfiler';
import { ResilienceLifecycleManager } from '../lifecycle/ResilienceLifecycleManager';
import { FailureClassifier } from '../retry/FailureClassifier';
import { RetryCalculator } from '../retry/RetryCalculator';
import { RetryPolicyValidator } from '../retry/RetryPolicyValidator';
import { TimeoutController } from '../timeout/TimeoutController';

export class ResilienceExecutorInstance implements ResilienceExecutor {
  private readonly _lifecycle: ResilienceLifecycleManager;
  private readonly _diagnostics: ResilienceDiagnostics;
  private readonly _defaultOptions?: ResilienceExecutionOptions | undefined;
  private readonly _circuitBreaker?: CircuitBreaker | undefined;
  private readonly _bulkhead?: Bulkhead | undefined;

  constructor(
    lifecycle: ResilienceLifecycleManager,
    diagnostics: ResilienceDiagnostics,
    defaultOptions?: ResilienceExecutionOptions,
    circuitBreaker?: CircuitBreaker,
    bulkhead?: Bulkhead,
  ) {
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._defaultOptions = defaultOptions;
    this._circuitBreaker =
      circuitBreaker ??
      (defaultOptions?.circuitBreaker
        ? new CircuitBreaker(defaultOptions.circuitBreaker, () =>
            this._diagnostics.recordCircuitTransition(),
          )
        : undefined);
    this._bulkhead =
      bulkhead ?? (defaultOptions?.bulkhead ? new Bulkhead(defaultOptions.bulkhead) : undefined);
  }

  public async execute<T>(
    operation: (signal: AbortSignal) => Promise<T> | T,
    options?: ResilienceExecutionOptions,
  ): Promise<T> {
    this._lifecycle.ensureOperational();
    this._diagnostics.recordExecutionStart();

    const mergedOptions: ResilienceExecutionOptions = {
      ...this._defaultOptions,
      ...options,
    };

    const retryPolicy = mergedOptions.retry
      ? RetryPolicyValidator.validate(mergedOptions.retry)
      : undefined;
    const timeoutPolicy = mergedOptions.timeout;
    const callerSignal = mergedOptions.signal;
    const fallback = mergedOptions.fallback;
    const shouldRetry = mergedOptions.shouldRetry;

    const circuitBreaker = options?.circuitBreaker
      ? new CircuitBreaker(options.circuitBreaker, () =>
          this._diagnostics.recordCircuitTransition(),
        )
      : this._circuitBreaker;

    const bulkhead = options?.bulkhead ? new Bulkhead(options.bulkhead) : this._bulkhead;

    const profiler = new ResilienceProfiler().start();
    const maxAttempts = retryPolicy?.maxAttempts ?? 1;
    let lastError: unknown;

    if (callerSignal?.aborted) {
      this._diagnostics.recordCancellation();
      this._diagnostics.recordFailure(profiler.elapsedMs);
      throw new CancellationError('Operation was cancelled by caller before execution');
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        this._diagnostics.recordRetry();
        const delayMs = RetryCalculator.calculateDelay(attempt, retryPolicy!);

        if (delayMs > 0) {
          if (callerSignal?.aborted) {
            this._diagnostics.recordCancellation();
            this._diagnostics.recordFailure(profiler.elapsedMs);
            throw new CancellationError('Operation was cancelled during retry backoff');
          }

          await new Promise<void>((resolve, reject) => {
            let timer: NodeJS.Timeout | undefined;
            let abortListener: (() => void) | undefined;

            const cleanup = (): void => {
              if (timer) {
                clearTimeout(timer);
                timer = undefined;
              }
              if (callerSignal && abortListener) {
                callerSignal.removeEventListener('abort', abortListener);
                abortListener = undefined;
              }
            };

            timer = setTimeout(() => {
              cleanup();
              resolve();
            }, delayMs);

            if (callerSignal) {
              abortListener = (): void => {
                cleanup();
                reject(new CancellationError('Operation was cancelled during retry backoff'));
              };
              callerSignal.addEventListener('abort', abortListener, { once: true });
            }
          });
        }
      }

      // 1. Circuit Breaker Check
      if (circuitBreaker) {
        try {
          circuitBreaker.beforeExecution();
        } catch (cbErr: unknown) {
          if (cbErr instanceof CircuitOpenError) {
            this._diagnostics.recordCircuitOpenRejection();
          }
          this._diagnostics.recordFailure(profiler.elapsedMs);
          if (fallback) {
            return FallbackExecutor.executeFallback<T>(
              fallback,
              cbErr,
              callerSignal ?? new AbortController().signal,
              () => this._diagnostics.recordFallback(true),
              () => this._diagnostics.recordFallback(false),
            );
          }
          throw cbErr;
        }
      }

      // 2. Bulkhead Admission
      if (bulkhead) {
        try {
          await bulkhead.acquire(callerSignal);
        } catch (bhErr: unknown) {
          if (bhErr instanceof BulkheadRejectedError) {
            this._diagnostics.recordBulkheadRejection();
          } else if (bhErr instanceof CancellationError) {
            this._diagnostics.recordCancellation();
          }
          this._diagnostics.recordFailure(profiler.elapsedMs);
          if (fallback && !(bhErr instanceof CancellationError)) {
            return FallbackExecutor.executeFallback<T>(
              fallback,
              bhErr,
              callerSignal ?? new AbortController().signal,
              () => this._diagnostics.recordFallback(true),
              () => this._diagnostics.recordFallback(false),
            );
          }
          throw bhErr;
        }
      }

      // 3. Execution under Timeout & Bulkhead
      const timeoutController = new TimeoutController(timeoutPolicy?.timeoutMs, callerSignal);
      try {
        const result = await operation(timeoutController.signal);
        timeoutController.checkErrors();

        circuitBreaker?.recordSuccess();
        this._diagnostics.recordSuccess(profiler.elapsedMs);
        return result;
      } catch (opErr: unknown) {
        timeoutController.cleanup();

        if (timeoutController.isCallerCancelled) {
          this._diagnostics.recordCancellation();
          lastError = new CancellationError('Operation was cancelled by caller');
          circuitBreaker?.recordFailure(lastError);
          break; // Stop immediately on caller cancellation
        } else if (timeoutController.isTimedOut) {
          this._diagnostics.recordTimeout();
          lastError = new TimeoutError(`Operation timed out after ${timeoutPolicy?.timeoutMs}ms`, {
            timeoutMs: timeoutPolicy?.timeoutMs,
          });
          circuitBreaker?.recordFailure(lastError);
        } else {
          lastError = opErr;
          circuitBreaker?.recordFailure(opErr);
        }

        const canRetry =
          attempt < maxAttempts &&
          FailureClassifier.shouldRetry(lastError, attempt, shouldRetry, () =>
            this._diagnostics.recordClassifierFailure(),
          );

        if (!canRetry) {
          break;
        }
      } finally {
        timeoutController.cleanup();
        bulkhead?.release();
      }
    }

    // All retries failed
    this._diagnostics.recordFailure(profiler.elapsedMs);

    if (fallback && !(lastError instanceof CancellationError)) {
      return FallbackExecutor.executeFallback<T>(
        fallback,
        lastError,
        callerSignal ?? new AbortController().signal,
        () => this._diagnostics.recordFallback(true),
        () => this._diagnostics.recordFallback(false),
      );
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new RetryExhaustedError('Operation failed after all retry attempts exhausted', {
      lastError,
    });
  }
}
