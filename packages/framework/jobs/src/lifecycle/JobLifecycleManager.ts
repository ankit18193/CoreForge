import { JobStateError } from '../errors/JobErrors';
import { JobQueueState } from '../types/jobTypes';

export class JobLifecycleManager {
  private _state: JobQueueState;

  constructor(initialState: JobQueueState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): JobQueueState {
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
      return; // Idempotent start
    }

    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new JobStateError(`Cannot start job queue from ${this._state} state`, {
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
      return; // Idempotent stop
    }

    this._state = 'STOPPING';
    this._state = 'STOPPED';
  }

  public ensureOperational(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new JobStateError(`Cannot perform job queue operations in ${this._state} state`, {
        state: this._state,
      });
    }

    if (this._state !== 'READY') {
      throw new JobStateError(
        `Cannot perform job queue operations before queue is in READY state (current: ${this._state})`,
        { state: this._state },
      );
    }
  }
}
