import { MiddlewareExecutionError } from '../errors/MiddlewareErrors';
import { MiddlewareState } from '../pipeline/MiddlewareState';

export class MiddlewareLifecycleManager {
  private _state = MiddlewareState.CREATED;

  public get state(): MiddlewareState {
    return this._state;
  }

  public transitionTo(target: MiddlewareState): void {
    const allowed: Record<MiddlewareState, MiddlewareState[]> = {
      [MiddlewareState.CREATED]: [MiddlewareState.BUILDING],
      [MiddlewareState.BUILDING]: [MiddlewareState.READY, MiddlewareState.FAILED],
      [MiddlewareState.READY]: [
        MiddlewareState.RUNNING,
        MiddlewareState.STOPPING,
        MiddlewareState.FAILED,
      ],
      [MiddlewareState.RUNNING]: [
        MiddlewareState.READY,
        MiddlewareState.STOPPING,
        MiddlewareState.FAILED,
      ],
      [MiddlewareState.STOPPING]: [MiddlewareState.STOPPED, MiddlewareState.FAILED],
      [MiddlewareState.STOPPED]: [MiddlewareState.BUILDING],
      [MiddlewareState.FAILED]: [MiddlewareState.BUILDING, MiddlewareState.STOPPING],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new MiddlewareExecutionError(
        `MiddlewareLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
