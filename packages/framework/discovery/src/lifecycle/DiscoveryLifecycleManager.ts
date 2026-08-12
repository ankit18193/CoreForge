import { DiscoveryState } from './DiscoveryState';
import { DiscoveryStateError } from '../errors/DiscoveryErrors';

export class DiscoveryLifecycleManager {
  private _state = DiscoveryState.CREATED;

  public get state(): DiscoveryState {
    return this._state;
  }

  public transitionTo(target: DiscoveryState): void {
    const allowed: Record<DiscoveryState, DiscoveryState[]> = {
      [DiscoveryState.CREATED]: [DiscoveryState.SCANNING, DiscoveryState.FAILED],
      [DiscoveryState.SCANNING]: [DiscoveryState.VALIDATING, DiscoveryState.FAILED],
      [DiscoveryState.VALIDATING]: [DiscoveryState.READY, DiscoveryState.FAILED],
      [DiscoveryState.READY]: [DiscoveryState.STOPPED, DiscoveryState.FAILED],
      [DiscoveryState.STOPPED]: [DiscoveryState.SCANNING, DiscoveryState.FAILED],
      [DiscoveryState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new DiscoveryStateError(
        `DiscoveryLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
