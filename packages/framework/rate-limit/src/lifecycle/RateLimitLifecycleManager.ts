import { RateLimitStateError } from '../errors/RateLimitErrors';
import { RateLimitState } from '../types/rateLimitTypes';

export class RateLimitLifecycleManager {
  private _state: RateLimitState;

  constructor(initialState: RateLimitState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): RateLimitState {
    return this._state;
  }

  public get isReady(): boolean {
    return this._state === 'READY';
  }

  public get isStopped(): boolean {
    return this._state === 'STOPPED';
  }

  public start(): void {
    if (this._state === 'READY') {
      return; // Idempotent
    }

    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new RateLimitStateError(`Cannot start rate limiter from ${this._state} state`, {
        state: this._state,
      });
    }

    this._state = 'READY';
  }

  public transitionToStopping(): void {
    if (this._state === 'STOPPED') {
      return;
    }
    this._state = 'STOPPING';
  }

  public transitionToStopped(): void {
    this._state = 'STOPPED';
  }

  public stop(): void {
    if (this._state === 'STOPPED') {
      return; // Idempotent
    }
    this._state = 'STOPPING';
    this._state = 'STOPPED';
  }

  public ensureOperational(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new RateLimitStateError(
        `Cannot perform rate limit operations in ${this._state} state`,
        { state: this._state },
      );
    }

    if (this._state !== 'READY') {
      throw new RateLimitStateError(
        `Cannot perform rate limit operations before rate limiter is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }
}
