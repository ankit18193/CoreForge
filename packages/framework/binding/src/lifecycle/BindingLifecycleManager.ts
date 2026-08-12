import { BindingState } from './BindingState';
import { BindingExecutionError } from '../errors/BindingErrors';

export class BindingLifecycleManager {
  private _state = BindingState.CREATED;

  public get state(): BindingState {
    return this._state;
  }

  public transitionTo(target: BindingState): void {
    const allowed: Record<BindingState, BindingState[]> = {
      [BindingState.CREATED]: [BindingState.READY],
      [BindingState.READY]: [BindingState.RUNNING, BindingState.STOPPED, BindingState.FAILED],
      [BindingState.RUNNING]: [BindingState.READY, BindingState.STOPPED, BindingState.FAILED],
      [BindingState.STOPPED]: [BindingState.READY],
      [BindingState.FAILED]: [BindingState.READY, BindingState.STOPPED],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new BindingExecutionError(
        `BindingLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
