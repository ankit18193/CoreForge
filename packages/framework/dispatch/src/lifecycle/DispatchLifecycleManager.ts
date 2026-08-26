import { DispatchStateError, HandlerRegistrationError } from '../errors/DispatchErrors';
import { DispatchState } from '../types/dispatchTypes';

export class DispatchLifecycleManager {
  private _state: DispatchState;

  constructor(initialState: DispatchState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): DispatchState {
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
      throw new DispatchStateError(`Cannot start dispatcher from ${this._state} state`);
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

  public ensureReadyForDispatch(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new DispatchStateError(`Cannot dispatch command in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new DispatchStateError(
        `Cannot dispatch command before dispatcher is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new HandlerRegistrationError(
        `Cannot register handler when dispatcher is in ${this._state} state`,
      );
    }
  }
}
