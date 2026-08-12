import { ControllerState } from './ControllerState';
import { ControllerStateError } from '../errors/ControllerErrors';

export class ControllerLifecycleManager {
  private _state = ControllerState.CREATED;

  public get state(): ControllerState {
    return this._state;
  }

  public transitionTo(target: ControllerState): void {
    const allowed: Record<ControllerState, ControllerState[]> = {
      [ControllerState.CREATED]: [ControllerState.REGISTERING],
      [ControllerState.REGISTERING]: [ControllerState.READY, ControllerState.FAILED],
      [ControllerState.READY]: [
        ControllerState.RUNNING,
        ControllerState.STOPPING,
        ControllerState.FAILED,
      ],
      [ControllerState.RUNNING]: [
        ControllerState.READY,
        ControllerState.STOPPING,
        ControllerState.FAILED,
      ],
      [ControllerState.STOPPING]: [ControllerState.STOPPED, ControllerState.FAILED],
      [ControllerState.STOPPED]: [ControllerState.REGISTERING],
      [ControllerState.FAILED]: [ControllerState.REGISTERING, ControllerState.STOPPING],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new ControllerStateError(
        `ControllerLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
