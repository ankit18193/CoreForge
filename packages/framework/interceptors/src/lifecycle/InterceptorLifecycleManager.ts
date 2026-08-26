import { InterceptorStateError } from '../errors/InterceptorErrors';
import { InterceptorState } from '../types/interceptorTypes';

export class InterceptorLifecycleManager {
  private _state: InterceptorState;

  constructor(initialState: InterceptorState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): InterceptorState {
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
      throw new InterceptorStateError(`Cannot start interceptor engine from ${this._state} state`);
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
      throw new InterceptorStateError(
        `Cannot execute interceptor operation in ${this._state} state`,
      );
    }

    if (this._state !== 'READY') {
      throw new InterceptorStateError(
        `Cannot execute interceptor operation before engine is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new InterceptorStateError(
        `Cannot register interceptor when engine is in ${this._state} state`,
      );
    }
  }
}
