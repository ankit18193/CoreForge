import { RuntimeInitializationState } from './RuntimeInitializationState';
import { RuntimeInitializationStateError } from '../errors/RuntimeInitializationErrors';

export class RuntimeInitializationLifecycleManager {
  private _state = RuntimeInitializationState.CREATED;

  public get state(): RuntimeInitializationState {
    return this._state;
  }

  public transitionTo(target: RuntimeInitializationState): void {
    const allowed: Record<
      RuntimeInitializationState,
      RuntimeInitializationState[]
    > = {
      [RuntimeInitializationState.CREATED]: [
        RuntimeInitializationState.PLANNING,
        RuntimeInitializationState.FAILED,
      ],
      [RuntimeInitializationState.PLANNING]: [
        RuntimeInitializationState.INITIALIZING,
        RuntimeInitializationState.FAILED,
      ],
      [RuntimeInitializationState.INITIALIZING]: [
        RuntimeInitializationState.READY,
        RuntimeInitializationState.ROLLING_BACK,
        RuntimeInitializationState.FAILED,
      ],
      [RuntimeInitializationState.ROLLING_BACK]: [
        RuntimeInitializationState.FAILED,
      ],
      [RuntimeInitializationState.READY]: [RuntimeInitializationState.FAILED],
      [RuntimeInitializationState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new RuntimeInitializationStateError(
        `RuntimeInitializationLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
