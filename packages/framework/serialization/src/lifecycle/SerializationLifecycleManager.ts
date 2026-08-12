import { SerializationState } from './SerializationState';
import { SerializationLifecycleError } from '../errors/SerializationErrors';

export class SerializationLifecycleManager {
  private _state = SerializationState.CREATED;

  public get state(): SerializationState {
    return this._state;
  }

  public transitionTo(target: SerializationState): void {
    const allowed: Record<SerializationState, SerializationState[]> = {
      [SerializationState.CREATED]: [SerializationState.INITIALIZED, SerializationState.FAILED],
      [SerializationState.INITIALIZED]: [SerializationState.READY, SerializationState.FAILED],
      [SerializationState.READY]: [SerializationState.STOPPED, SerializationState.FAILED],
      [SerializationState.STOPPED]: [SerializationState.READY, SerializationState.FAILED],
      [SerializationState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new SerializationLifecycleError(
        `SerializationLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
