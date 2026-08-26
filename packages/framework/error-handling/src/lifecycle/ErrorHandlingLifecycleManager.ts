import {
  ErrorHandlerRegistrationError,
  ErrorHandlingStateError,
} from '../errors/ErrorHandlingErrors';
import { ErrorHandlingState } from '../types/errorHandlingTypes';

export class ErrorHandlingLifecycleManager {
  private _state: ErrorHandlingState;

  constructor(initialState: ErrorHandlingState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): ErrorHandlingState {
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
      throw new ErrorHandlingStateError(
        `Cannot start error handling engine from ${this._state} state`,
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

  public ensureReadyForProcessing(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new ErrorHandlingStateError(`Cannot process error in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new ErrorHandlingStateError(
        `Cannot process error before error handling engine is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new ErrorHandlerRegistrationError(
        `Cannot register error handler when error handling engine is in ${this._state} state`,
      );
    }
  }
}
