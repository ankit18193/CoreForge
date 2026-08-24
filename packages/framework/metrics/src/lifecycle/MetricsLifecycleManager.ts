import { MetricsStateError } from '../errors/MetricsErrors';
import { MetricsState } from '../types/metricsTypes';

export class MetricsLifecycleManager {
  private _state: MetricsState;

  constructor(initialState: MetricsState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): MetricsState {
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
      throw new MetricsStateError(`Cannot start metrics manager from ${this._state} state`, {
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
      throw new MetricsStateError(`Cannot perform metric operations in ${this._state} state`, {
        state: this._state,
      });
    }

    if (this._state !== 'READY') {
      throw new MetricsStateError(
        `Cannot perform metric operations before metrics manager is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }
}
