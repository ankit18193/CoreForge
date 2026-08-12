import { RequestExecutionError } from '../errors/RequestHandlerErrors';
import { RequestState } from '../pipeline/RequestState';

export class RequestLifecycleManager {
  private _state = RequestState.CREATED;

  public get state(): RequestState {
    return this._state;
  }

  public transitionTo(target: RequestState): void {
    const allowed: Record<RequestState, RequestState[]> = {
      [RequestState.CREATED]: [RequestState.ROUTING],
      [RequestState.ROUTING]: [
        RequestState.MIDDLEWARE,
        RequestState.RESPONDING,
        RequestState.FAILED,
      ],
      [RequestState.MIDDLEWARE]: [
        RequestState.CONTROLLER,
        RequestState.RESPONDING,
        RequestState.FAILED,
      ],
      [RequestState.CONTROLLER]: [RequestState.RESPONDING, RequestState.FAILED],
      [RequestState.RESPONDING]: [RequestState.COMPLETED, RequestState.FAILED],
      [RequestState.COMPLETED]: [],
      [RequestState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new RequestExecutionError(
        `RequestLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
