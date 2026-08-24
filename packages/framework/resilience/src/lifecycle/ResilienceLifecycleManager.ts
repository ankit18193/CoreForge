import { ResilienceStateError } from '../errors/ResilienceErrors';
import { ResilienceState } from '../types/resilienceTypes';

export class ResilienceLifecycleManager {
  private _state: ResilienceState;

  constructor(initialState: ResilienceState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): ResilienceState {
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
      throw new ResilienceStateError(`Cannot start resilience manager from ${this._state} state`, {
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
      throw new ResilienceStateError(
        `Cannot perform resilience operations in ${this._state} state`,
        { state: this._state },
      );
    }

    if (this._state !== 'READY') {
      throw new ResilienceStateError(
        `Cannot perform resilience operations before resilience manager is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }
}
