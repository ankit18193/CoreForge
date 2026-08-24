import { CircuitBreakerPolicy, CircuitState } from '@coreforge/contracts';

import {
  CancellationError,
  CircuitOpenError,
  ResilienceConfigurationError,
} from '../errors/ResilienceErrors';

export class CircuitBreaker {
  private readonly _failureThreshold: number;
  private readonly _resetTimeoutMs: number;
  private _state: CircuitState = 'CLOSED';
  private _consecutiveFailures = 0;
  private _openedAt = 0;
  private _probeInFlight = false;
  private readonly _onTransition?: ((from: CircuitState, to: CircuitState) => void) | undefined;

  constructor(
    policy: CircuitBreakerPolicy,
    onTransition?: (from: CircuitState, to: CircuitState) => void,
  ) {
    if (
      typeof policy.failureThreshold !== 'number' ||
      !Number.isFinite(policy.failureThreshold) ||
      policy.failureThreshold <= 0
    ) {
      throw new ResilienceConfigurationError(
        'CircuitBreaker failureThreshold must be a positive number (> 0)',
        { policy },
      );
    }

    if (
      typeof policy.resetTimeoutMs !== 'number' ||
      !Number.isFinite(policy.resetTimeoutMs) ||
      policy.resetTimeoutMs <= 0
    ) {
      throw new ResilienceConfigurationError(
        'CircuitBreaker resetTimeoutMs must be a positive number (> 0)',
        { policy },
      );
    }

    this._failureThreshold = policy.failureThreshold;
    this._resetTimeoutMs = policy.resetTimeoutMs;
    this._onTransition = onTransition;
  }

  public get state(): CircuitState {
    this._checkHalfOpenTransition();
    return this._state;
  }

  public get consecutiveFailures(): number {
    return this._consecutiveFailures;
  }

  public beforeExecution(): void {
    this._checkHalfOpenTransition();

    if (this._state === 'OPEN') {
      throw new CircuitOpenError('Circuit breaker is OPEN; fast-rejecting execution', {
        state: 'OPEN',
        openedAt: this._openedAt,
        resetTimeoutMs: this._resetTimeoutMs,
      });
    }

    if (this._state === 'HALF_OPEN') {
      if (this._probeInFlight) {
        throw new CircuitOpenError(
          'Circuit breaker is HALF_OPEN; probe execution is already in flight',
          { state: 'HALF_OPEN' },
        );
      }
      this._probeInFlight = true;
    }
  }

  public recordSuccess(): void {
    if (this._state === 'HALF_OPEN') {
      const from = this._state;
      this._state = 'CLOSED';
      this._consecutiveFailures = 0;
      this._probeInFlight = false;
      this._onTransition?.(from, 'CLOSED');
    } else if (this._state === 'CLOSED') {
      this._consecutiveFailures = 0;
    }
  }

  public recordFailure(error: unknown): void {
    if (error instanceof CancellationError || error instanceof CircuitOpenError) {
      return; // Do not count caller cancellations or open rejections
    }

    if (this._state === 'HALF_OPEN') {
      const from = this._state;
      this._state = 'OPEN';
      this._openedAt = Date.now();
      this._probeInFlight = false;
      this._onTransition?.(from, 'OPEN');
    } else if (this._state === 'CLOSED') {
      this._consecutiveFailures++;
      if (this._consecutiveFailures >= this._failureThreshold) {
        const from = this._state;
        this._state = 'OPEN';
        this._openedAt = Date.now();
        this._onTransition?.(from, 'OPEN');
      }
    }
  }

  public reset(): void {
    this._state = 'CLOSED';
    this._consecutiveFailures = 0;
    this._openedAt = 0;
    this._probeInFlight = false;
  }

  private _checkHalfOpenTransition(): void {
    if (this._state === 'OPEN') {
      const elapsed = Date.now() - this._openedAt;
      if (elapsed >= this._resetTimeoutMs) {
        const from = this._state;
        this._state = 'HALF_OPEN';
        this._probeInFlight = false;
        this._onTransition?.(from, 'HALF_OPEN');
      }
    }
  }
}
