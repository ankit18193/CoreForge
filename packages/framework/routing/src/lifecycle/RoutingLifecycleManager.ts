import { RoutingState } from './RoutingState';
import { RoutingStateError } from '../errors/RoutingErrors';

export class RoutingLifecycleManager {
  private _state: RoutingState = 'CREATED';

  public get state(): RoutingState {
    return this._state;
  }

  public setCompiling(): void {
    if (this._state !== 'CREATED') {
      throw new RoutingStateError(
        `Cannot transition to COMPILING from state '${this._state}'. Must be in CREATED state.`,
      );
    }
    this._state = 'COMPILING';
  }

  public makeReady(): void {
    if (this._state !== 'CREATED' && this._state !== 'COMPILING') {
      throw new RoutingStateError(`Cannot transition to READY from state '${this._state}'.`);
    }
    this._state = 'READY';
  }

  public start(): void {
    if (this._state === 'CREATED' || this._state === 'COMPILING') {
      this._state = 'READY';
    }
    if (this._state !== 'READY') {
      throw new RoutingStateError(
        `Cannot transition to RUNNING from state '${this._state}'. Must be in READY state.`,
      );
    }
    this._state = 'RUNNING';
  }

  public stop(): void {
    if (this._state === 'STOPPED') {
      return;
    }
    this._state = 'STOPPED';
  }

  public ensureCanMatch(): void {
    if (this._state !== 'READY' && this._state !== 'RUNNING') {
      throw new RoutingStateError(
        `Cannot perform route matching while routing engine is in state '${this._state}'. Must be READY or RUNNING.`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (
      this._state === 'READY' ||
      this._state === 'RUNNING' ||
      this._state === 'STOPPED' ||
      this._state === 'STOPPING'
    ) {
      throw new RoutingStateError(
        `Cannot register routes while routing engine is in state '${this._state}'. Registration is only allowed before READY.`,
      );
    }
  }
}
