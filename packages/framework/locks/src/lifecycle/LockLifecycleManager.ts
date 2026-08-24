import { LockStateError } from '../errors/LockErrors';
import { LockState } from '../types/lockTypes';

export class LockLifecycleManager {
  private _state: LockState;

  constructor(initialState: LockState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): LockState {
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
      throw new LockStateError(`Cannot start lock manager from ${this._state} state`, {
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
      throw new LockStateError(`Cannot perform lock operations in ${this._state} state`, {
        state: this._state,
      });
    }

    if (this._state !== 'READY') {
      throw new LockStateError(
        `Cannot perform lock operations before lock manager is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }
}
