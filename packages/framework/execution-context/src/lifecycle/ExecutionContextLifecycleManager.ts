import { ExecutionContextStateError } from '../errors/ExecutionContextErrors';
import { ExecutionManagerState } from '../types/executionContextTypes';

export class ExecutionContextLifecycleManager {
  private _state: ExecutionManagerState;

  constructor(initialState: ExecutionManagerState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): ExecutionManagerState {
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
      throw new ExecutionContextStateError(
        `Cannot start execution context manager from ${this._state} state`,
        { state: this._state },
      );
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

  public ensureReadyForCreation(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new ExecutionContextStateError(
        `Cannot create execution context in ${this._state} state`,
        { state: this._state },
      );
    }

    if (this._state !== 'READY') {
      throw new ExecutionContextStateError(
        `Cannot create execution context before manager is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }

  public ensureOperational(): void {
    if (this._state === 'STOPPED') {
      throw new ExecutionContextStateError(
        `Cannot perform execution context operations in ${this._state} state`,
        { state: this._state },
      );
    }
  }
}
