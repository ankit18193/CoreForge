import { HttpInitializationError } from '../errors/HttpErrors';
import { HttpServerState } from '../server/HttpServerState';

export class ServerLifecycleManager {
  private _state = HttpServerState.CREATED;

  public get state(): HttpServerState {
    return this._state;
  }

  public transitionTo(target: HttpServerState): void {
    const allowed: Record<HttpServerState, HttpServerState[]> = {
      [HttpServerState.CREATED]: [HttpServerState.STARTING],
      [HttpServerState.STARTING]: [HttpServerState.RUNNING, HttpServerState.FAILED],
      [HttpServerState.RUNNING]: [HttpServerState.STOPPING, HttpServerState.FAILED],
      [HttpServerState.STOPPING]: [HttpServerState.STOPPED, HttpServerState.FAILED],
      [HttpServerState.STOPPED]: [HttpServerState.STARTING],
      [HttpServerState.FAILED]: [HttpServerState.STARTING, HttpServerState.STOPPING],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new HttpInitializationError(
        `ServerLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
