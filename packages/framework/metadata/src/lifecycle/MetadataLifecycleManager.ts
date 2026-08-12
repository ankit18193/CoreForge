import { MetadataState } from './MetadataState';
import { MetadataStateError } from '../errors/MetadataErrors';

export class MetadataLifecycleManager {
  private _state = MetadataState.CREATED;

  public get state(): MetadataState {
    return this._state;
  }

  public transitionTo(target: MetadataState): void {
    const allowed: Record<MetadataState, MetadataState[]> = {
      [MetadataState.CREATED]: [MetadataState.REGISTERING, MetadataState.FAILED],
      [MetadataState.REGISTERING]: [MetadataState.READY, MetadataState.FAILED],
      [MetadataState.READY]: [MetadataState.STOPPED, MetadataState.FAILED],
      [MetadataState.STOPPED]: [MetadataState.REGISTERING, MetadataState.FAILED],
      [MetadataState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new MetadataStateError(
        `MetadataLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
