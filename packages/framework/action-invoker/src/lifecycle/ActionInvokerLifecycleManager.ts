import { ActionInvokerState } from './ActionInvokerState';
import { ActionInvokerLifecycleError } from '../errors/ActionInvokerErrors';

export class ActionInvokerLifecycleManager {
  private _state = ActionInvokerState.CREATED;

  public get state(): ActionInvokerState {
    return this._state;
  }

  public transitionTo(target: ActionInvokerState): void {
    const allowed: Record<ActionInvokerState, ActionInvokerState[]> = {
      [ActionInvokerState.CREATED]: [ActionInvokerState.INITIALIZED, ActionInvokerState.FAILED],
      [ActionInvokerState.INITIALIZED]: [ActionInvokerState.READY, ActionInvokerState.FAILED],
      [ActionInvokerState.READY]: [ActionInvokerState.STOPPED, ActionInvokerState.FAILED],
      [ActionInvokerState.STOPPED]: [ActionInvokerState.READY, ActionInvokerState.FAILED],
      [ActionInvokerState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new ActionInvokerLifecycleError(
        `ActionInvokerLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
