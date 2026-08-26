import { ApplicationRegistrationError, ApplicationStateError } from '../errors/ApplicationErrors';
import { ApplicationState } from '../types/applicationTypes';

export class ApplicationLifecycleManager {
  private _state: ApplicationState;

  constructor(initialState: ApplicationState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): ApplicationState {
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
      throw new ApplicationStateError(`Cannot start application manager from ${this._state} state`);
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
      throw new ApplicationStateError(`Cannot execute service in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new ApplicationStateError(
        `Cannot execute service before application manager is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new ApplicationRegistrationError(
        `Cannot register service when application manager is in ${this._state} state`,
      );
    }
  }
}
