import { LoggingState } from './LoggingState';
import { LoggingStateError } from '../errors/LoggingErrors';

export class LoggingLifecycleManager {
  private _state: LoggingState = 'CREATED';

  public get state(): LoggingState {
    return this._state;
  }

  public get ready(): boolean {
    return this._state === 'READY';
  }

  public get isStopped(): boolean {
    return this._state === 'STOPPED' || this._state === 'STOPPING';
  }

  public setReady(): void {
    if (this._state === 'READY') {
      return;
    }
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new LoggingStateError(`Cannot transition to READY from state '${this._state}'.`);
    }
    this._state = 'READY';
  }

  public setStopping(): void {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return;
    }
    if (this._state !== 'READY') {
      throw new LoggingStateError(
        `Cannot transition to STOPPING from state '${this._state}'. Must be READY.`,
      );
    }
    this._state = 'STOPPING';
  }

  public setStopped(): void {
    this._state = 'STOPPED';
  }

  public assertCanLog(autoStart = false): boolean {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return false; // Safe no-op after stop
    }

    if (this._state === 'CREATED') {
      if (autoStart) {
        this.setReady();
        return true;
      }
      throw new LoggingStateError(
        'Logger has not been initialized. Call start() or enable autoStart.',
      );
    }

    return true;
  }
}
