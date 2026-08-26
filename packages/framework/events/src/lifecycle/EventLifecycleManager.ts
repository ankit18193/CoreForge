import { EventHandlerRegistrationError, EventStateError } from '../errors/EventErrors';
import { EventState } from '../types/eventTypes';

export class EventLifecycleManager {
  private _state: EventState;

  constructor(initialState: EventState = 'CREATED') {
    this._state = initialState;
  }

  public get state(): EventState {
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
      throw new EventStateError(`Cannot start event publisher from ${this._state} state`);
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

  public ensureReadyForPublish(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new EventStateError(`Cannot publish event in ${this._state} state`);
    }

    if (this._state !== 'READY') {
      throw new EventStateError(
        `Cannot publish event before event publisher is READY (current: ${this._state})`,
      );
    }
  }

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new EventHandlerRegistrationError(
        `Cannot register handler when event publisher is in ${this._state} state`,
      );
    }
  }
}
