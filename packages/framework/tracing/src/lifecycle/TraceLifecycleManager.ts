import { TracingStateError } from '../errors/TracingErrors';
import { TraceState } from '../types/tracingTypes';

export class TraceLifecycleManager {
  private _state: TraceState;

  constructor(initialState: TraceState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): TraceState {
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
      throw new TracingStateError(`Cannot start trace manager from ${this._state} state`, {
        state: this._state,
      });
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

  public ensureCanStartSpan(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new TracingStateError(`Cannot start new spans in ${this._state} state`, {
        state: this._state,
      });
    }

    if (this._state !== 'READY') {
      throw new TracingStateError(
        `Cannot start spans before trace manager is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }

  public ensureOperational(): void {
    if (this._state !== 'READY') {
      throw new TracingStateError(`Cannot perform tracing operations in ${this._state} state`, {
        state: this._state,
      });
    }
  }
}
