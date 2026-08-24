import {
  BulkheadPolicy,
  CircuitBreakerPolicy,
  ResilienceExecutionOptions,
  ResilienceRetryPolicy,
  ResilienceTimeoutPolicy,
} from '@coreforge/contracts';

import { ResilienceManager } from './ResilienceManager';
import { ResilienceOptions } from '../types/resilienceTypes';

export class ResilienceBuilder {
  private _retry?: ResilienceRetryPolicy | undefined;
  private _timeout?: ResilienceTimeoutPolicy | undefined;
  private _circuitBreaker?: CircuitBreakerPolicy | undefined;
  private _bulkhead?: BulkheadPolicy | undefined;
  private _fallback?:
    ((error: unknown, signal: AbortSignal) => Promise<unknown> | unknown) | undefined;
  private _shouldRetry?: ((error: unknown, attempt: number) => boolean) | undefined;
  private _autoStart = true;

  public retry(policy: ResilienceRetryPolicy): this {
    this._retry = policy;
    return this;
  }

  public timeout(policy: ResilienceTimeoutPolicy): this {
    this._timeout = policy;
    return this;
  }

  public circuitBreaker(policy: CircuitBreakerPolicy): this {
    this._circuitBreaker = policy;
    return this;
  }

  public bulkhead(policy: BulkheadPolicy): this {
    this._bulkhead = policy;
    return this;
  }

  public fallback(fn: (error: unknown, signal: AbortSignal) => Promise<unknown> | unknown): this {
    this._fallback = fn;
    return this;
  }

  public shouldRetry(fn: (error: unknown, attempt: number) => boolean): this {
    this._shouldRetry = fn;
    return this;
  }

  public autoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): ResilienceManager {
    const defaultOptions: ResilienceExecutionOptions = {
      retry: this._retry,
      timeout: this._timeout,
      circuitBreaker: this._circuitBreaker,
      bulkhead: this._bulkhead,
      fallback: this._fallback,
      shouldRetry: this._shouldRetry,
    };

    const options: ResilienceOptions = {
      defaultOptions,
      autoStart: this._autoStart,
    };

    return new ResilienceManager(options);
  }
}
