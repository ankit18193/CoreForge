import { RuntimeExecutionState } from './RuntimeExecutionState';
import { RuntimeExecutionStateError } from '../errors/RuntimeExecutionErrors';

export class RuntimeExecutionLifecycleManager {
  private _state = RuntimeExecutionState.CREATED;

  public get state(): RuntimeExecutionState {
    return this._state;
  }

  public transitionTo(target: RuntimeExecutionState): void {
    const allowed: Record<RuntimeExecutionState, RuntimeExecutionState[]> = {
      [RuntimeExecutionState.CREATED]: [
        RuntimeExecutionState.STARTING,
        RuntimeExecutionState.FAILED,
      ],
      [RuntimeExecutionState.STARTING]: [
        RuntimeExecutionState.RUNNING,
        RuntimeExecutionState.FAILED,
      ],
      [RuntimeExecutionState.RUNNING]: [
        RuntimeExecutionState.STOPPING,
        RuntimeExecutionState.FAILED,
      ],
      [RuntimeExecutionState.STOPPING]: [
        RuntimeExecutionState.STOPPED,
        RuntimeExecutionState.FAILED,
      ],
      [RuntimeExecutionState.STOPPED]: [
        RuntimeExecutionState.STARTING,
        RuntimeExecutionState.FAILED,
      ],
      [RuntimeExecutionState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new RuntimeExecutionStateError(
        `RuntimeExecutionLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
