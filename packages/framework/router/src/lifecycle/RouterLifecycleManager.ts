import { RouterStateError } from '../errors/RouterErrors';
import { RouteState } from '../router/RouteState';

export class RouterLifecycleManager {
  private _state = RouteState.CREATED;

  public get state(): RouteState {
    return this._state;
  }

  public transitionTo(target: RouteState): void {
    const allowed: Record<RouteState, RouteState[]> = {
      [RouteState.CREATED]: [RouteState.REGISTERING],
      [RouteState.REGISTERING]: [RouteState.READY, RouteState.FAILED],
      [RouteState.READY]: [RouteState.STOPPING, RouteState.FAILED],
      [RouteState.STOPPING]: [RouteState.STOPPED, RouteState.FAILED],
      [RouteState.STOPPED]: [RouteState.REGISTERING],
      [RouteState.FAILED]: [RouteState.REGISTERING, RouteState.STOPPING],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new RouterStateError(
        `RouterLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
