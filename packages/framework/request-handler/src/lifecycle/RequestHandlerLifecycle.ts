import { RequestExecutionError } from '../errors/RequestHandlerErrors';

export enum RequestHandlerState {
  CREATED = 'CREATED',
  READY = 'READY',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  FAILED = 'FAILED',
}

export class RequestHandlerLifecycle {
  private _state = RequestHandlerState.CREATED;

  public get state(): RequestHandlerState {
    return this._state;
  }

  public transitionTo(target: RequestHandlerState): void {
    const allowed: Record<RequestHandlerState, RequestHandlerState[]> = {
      [RequestHandlerState.CREATED]: [RequestHandlerState.READY],
      [RequestHandlerState.READY]: [
        RequestHandlerState.RUNNING,
        RequestHandlerState.STOPPING,
        RequestHandlerState.FAILED,
      ],
      [RequestHandlerState.RUNNING]: [
        RequestHandlerState.READY,
        RequestHandlerState.STOPPING,
        RequestHandlerState.FAILED,
      ],
      [RequestHandlerState.STOPPING]: [RequestHandlerState.STOPPED, RequestHandlerState.FAILED],
      [RequestHandlerState.STOPPED]: [RequestHandlerState.READY],
      [RequestHandlerState.FAILED]: [RequestHandlerState.READY, RequestHandlerState.STOPPING],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new RequestExecutionError(
        `RequestHandlerLifecycle: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
