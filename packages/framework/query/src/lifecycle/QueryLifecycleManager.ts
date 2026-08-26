import { QueryHandlerRegistrationError, QueryStateError } from '../errors/QueryErrors';
import { QueryState } from '../types/queryTypes';

export class QueryLifecycleManager {
  private _state: QueryState;

  constructor(initialState: QueryState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): QueryState {
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
      throw new QueryStateError(`Cannot start query bus from ${this._state} state`);
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

  public ensureReadyForQuery(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new QueryStateError(`Cannot execute query in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new QueryStateError(
        `Cannot execute query before query bus is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new QueryHandlerRegistrationError(
        `Cannot register handler when query bus is in ${this._state} state`,
      );
    }
  }
}
