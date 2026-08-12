import { InterceptorState } from './InterceptorState';
import { InterceptorLifecycleError } from '../errors/InterceptorErrors';

export class InterceptorLifecycleManager {
  private _state = InterceptorState.CREATED;

  public get state(): InterceptorState {
    return this._state;
  }

  public transitionTo(target: InterceptorState): void {
    const allowed: Record<InterceptorState, InterceptorState[]> = {
      [InterceptorState.CREATED]: [InterceptorState.INITIALIZED, InterceptorState.FAILED],
      [InterceptorState.INITIALIZED]: [InterceptorState.READY, InterceptorState.FAILED],
      [InterceptorState.READY]: [InterceptorState.STOPPED, InterceptorState.FAILED],
      [InterceptorState.STOPPED]: [InterceptorState.READY, InterceptorState.FAILED],
      [InterceptorState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new InterceptorLifecycleError(
        `InterceptorLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
