import { CacheStateError } from '../errors/CacheErrors';
import { CacheState } from '../types/cacheTypes';

export class CacheLifecycleManager {
  private _state: CacheState;

  constructor(initialState: CacheState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): CacheState {
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
      return; // Idempotent start
    }

    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new CacheStateError(`Cannot start cache from ${this._state} state`, {
        state: this._state,
      });
    }

    this._state = 'READY';
  }

  public stop(): void {
    if (this._state === 'STOPPED') {
      return; // Idempotent stop
    }

    this._state = 'STOPPING';
    this._state = 'STOPPED';
  }

  public ensureOperational(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new CacheStateError(`Cannot perform cache operations in ${this._state} state`, {
        state: this._state,
      });
    }

    if (this._state !== 'READY') {
      throw new CacheStateError(
        `Cannot perform cache operations before cache is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }
}
