import { ResponseState } from './ResponseState';
import { ResponseStateError } from '../errors/ResponseErrors';

export class ResponseLifecycleManager {
  private _state: ResponseState = ResponseState.CREATED;

  private static readonly VALID_TRANSITIONS: ReadonlyMap<
    ResponseState,
    ReadonlySet<ResponseState>
  > = new Map([
    [ResponseState.CREATED, new Set([ResponseState.READY, ResponseState.STOPPED])],
    [
      ResponseState.READY,
      new Set([ResponseState.RUNNING, ResponseState.STOPPING, ResponseState.STOPPED]),
    ],
    [ResponseState.RUNNING, new Set([ResponseState.STOPPING, ResponseState.STOPPED])],
    [ResponseState.STOPPING, new Set([ResponseState.STOPPED])],
    [ResponseState.STOPPED, new Set<ResponseState>()],
  ]);

  public get state(): ResponseState {
    return this._state;
  }

  public transitionTo(nextState: ResponseState): void {
    if (this._state === nextState) {
      return;
    }

    const allowed = ResponseLifecycleManager.VALID_TRANSITIONS.get(this._state);
    if (!allowed || !allowed.has(nextState)) {
      throw new ResponseStateError(
        `Invalid Response state transition from "${this._state}" to "${nextState}".`,
        { currentState: this._state, requestedState: nextState },
      );
    }

    this._state = nextState;
  }

  public assertCanProcess(): void {
    if (this._state === ResponseState.STOPPING || this._state === ResponseState.STOPPED) {
      throw new ResponseStateError(
        `Cannot process response: response processor is in state "${this._state}".`,
        { currentState: this._state },
      );
    }
  }
}
