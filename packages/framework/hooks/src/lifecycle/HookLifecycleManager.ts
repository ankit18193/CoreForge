import { HookRegistrationError, HookStateError } from '../errors/HookErrors';
import { HookState } from '../types/hookTypes';

export class HookLifecycleManager {
  private _state: HookState;

  constructor(initialState: HookState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): HookState {
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
      throw new HookStateError(`Cannot start hook manager from ${this._state} state`);
    }

    this._state = 'READY';
  }

  public transitionToStopping(): void {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return; // Idempotent
    }
    this._state = 'STOPPING';
  }

  public transitionToStopped(): void {
    this._state = 'STOPPED';
  }

  public ensureReadyForOperations(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new HookStateError(`Cannot execute hook when hook manager is in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new HookStateError(
        `Cannot execute hook before hook manager is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new HookRegistrationError(
        `Cannot register hook when hook manager is in ${this._state} state`,
      );
    }
  }
}
