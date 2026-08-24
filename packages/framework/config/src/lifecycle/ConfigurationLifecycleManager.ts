import { ConfigurationState } from './ConfigurationState';
import { ConfigurationStateError } from '../errors/ConfigurationErrors';

export class ConfigurationLifecycleManager {
  private _state: ConfigurationState = 'CREATED';

  public get state(): ConfigurationState {
    return this._state;
  }

  public get ready(): boolean {
    return this._state === 'READY';
  }

  public setLoading(): void {
    if (this._state !== 'CREATED' && this._state !== 'READY') {
      throw new ConfigurationStateError(
        `Cannot transition to LOADING from state '${this._state}'.`,
      );
    }
    this._state = 'LOADING';
  }

  public setValidating(): void {
    if (this._state !== 'LOADING') {
      throw new ConfigurationStateError(
        `Cannot transition to VALIDATING from state '${this._state}'. Must be LOADING.`,
      );
    }
    this._state = 'VALIDATING';
  }

  public setReady(): void {
    if (this._state !== 'VALIDATING') {
      throw new ConfigurationStateError(
        `Cannot transition to READY from state '${this._state}'. Must be VALIDATING.`,
      );
    }
    this._state = 'READY';
  }

  public setStopping(): void {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return;
    }
    if (this._state !== 'READY') {
      throw new ConfigurationStateError(
        `Cannot transition to STOPPING from state '${this._state}'. Must be READY.`,
      );
    }
    this._state = 'STOPPING';
  }

  public setStopped(): void {
    if (this._state === 'STOPPED') {
      return;
    }
    this._state = 'STOPPED';
  }

  public reset(): void {
    this._state = 'CREATED';
  }
}
