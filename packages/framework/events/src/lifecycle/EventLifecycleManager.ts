import { EventStateError } from '../errors/EventErrors';
import { EventState } from '../types/eventTypes';

export class EventLifecycleManager {
  private _state: EventState = 'CREATED';

  public get state(): EventState {
    return this._state;
  }

  public get ready(): boolean {
    return this._state === 'READY';
  }

  public get isStopped(): boolean {
    return this._state === 'STOPPED' || this._state === 'STOPPING';
  }

  public start(): void {
    if (this._state === 'READY') {
      return; // Idempotent
    }
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new EventStateError(`Cannot start EventBus from state '${this._state}'.`);
    }
    this._state = 'READY';
  }

  public stop(): void {
    if (this._state === 'STOPPED') {
      return; // Idempotent
    }
    this._state = 'STOPPED';
  }

  public setStopping(): void {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return;
    }
    this._state = 'STOPPING';
  }

  public assertCanSubscribe(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new EventStateError(
        `Cannot subscribe to events when EventBus is in state '${this._state}'.`,
      );
    }
  }

  public assertCanEmit(autoStart = true): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new EventStateError(`Cannot emit events when EventBus is in state '${this._state}'.`);
    }

    if (this._state === 'CREATED') {
      if (autoStart) {
        this.start();
        return;
      }
      throw new EventStateError('EventBus has not been started. Call start() or enable autoStart.');
    }
  }
}
