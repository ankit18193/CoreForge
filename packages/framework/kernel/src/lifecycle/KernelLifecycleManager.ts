import { KernelRegistrationError, KernelStateError } from '../errors/KernelErrors';
import { KernelState } from '../types/kernelTypes';

export class KernelLifecycleManager {
  private _state: KernelState;

  constructor(initialState: KernelState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): KernelState {
    return this._state;
  }

  public get isReady(): boolean {
    return this._state === 'READY';
  }

  public get isStopped(): boolean {
    return this._state === 'STOPPED';
  }

  public transitionToInitializing(): void {
    if (this._state === 'READY') {
      return; // Already ready
    }

    if (this._state === 'INITIALIZING') {
      return; // Idempotent
    }

    if (this._state !== 'CREATED') {
      throw new KernelStateError(`Cannot initialize kernel from ${this._state} state`);
    }

    this._state = 'INITIALIZING';
  }

  public transitionToReady(): void {
    if (this._state === 'READY') {
      return; // Idempotent
    }

    if (this._state !== 'INITIALIZING' && this._state !== 'CREATED') {
      throw new KernelStateError(`Cannot transition kernel to READY from ${this._state} state`);
    }

    this._state = 'READY';
  }

  public transitionToStopping(): void {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return;
    }
    this._state = 'STOPPING';
  }

  public transitionToStopped(): void {
    this._state = 'STOPPED';
  }

  public ensureReadyForOperations(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new KernelStateError(`Cannot execute operation on kernel in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new KernelStateError(
        `Cannot execute operation before kernel is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new KernelRegistrationError(
        `Cannot register kernel component when kernel is in ${this._state} state`,
      );
    }
  }
}
