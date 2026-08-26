import { ExecutionEngineStateError } from '../errors/ExecutionErrors';
import { ExecutionEngineState } from '../types/executionTypes';

export class ExecutionEngineLifecycleManager {
  private _state: ExecutionEngineState;

  constructor(initialState: ExecutionEngineState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): ExecutionEngineState {
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
      throw new ExecutionEngineStateError(
        `Cannot start execution engine from ${this._state} state`,
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

  public ensureReadyForExecution(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new ExecutionEngineStateError(`Cannot execute operation in ${this._state} state`, {
        state: this._state,
      });
    }

    if (this._state !== 'READY') {
      throw new ExecutionEngineStateError(
        `Cannot execute operation before execution engine is READY (current: ${this._state})`,
        { state: this._state },
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new ExecutionEngineStateError(
        `Cannot register middleware when execution engine is in ${this._state} state`,
        { state: this._state },
      );
    }
  }
}
