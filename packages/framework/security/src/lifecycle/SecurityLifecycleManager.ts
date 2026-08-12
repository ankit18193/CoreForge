import { SecurityState } from './SecurityState';
import { SecurityLifecycleError } from '../errors/SecurityErrors';

export class SecurityLifecycleManager {
  private _state = SecurityState.CREATED;

  public get state(): SecurityState {
    return this._state;
  }

  public transitionTo(target: SecurityState): void {
    const allowed: Record<SecurityState, SecurityState[]> = {
      [SecurityState.CREATED]: [SecurityState.INITIALIZED, SecurityState.FAILED],
      [SecurityState.INITIALIZED]: [SecurityState.READY, SecurityState.FAILED],
      [SecurityState.READY]: [SecurityState.STOPPED, SecurityState.FAILED],
      [SecurityState.STOPPED]: [SecurityState.READY, SecurityState.FAILED],
      [SecurityState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new SecurityLifecycleError(
        `SecurityLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
