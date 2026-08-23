import { ExceptionState } from './ExceptionState';
import { ExceptionStateError } from '../errors/ExceptionErrors';

export class ExceptionLifecycleManager {
  private _state: ExceptionState = ExceptionState.CREATED;

  private static readonly VALID_TRANSITIONS: ReadonlyMap<
    ExceptionState,
    ReadonlySet<ExceptionState>
  > = new Map([
    [ExceptionState.CREATED, new Set([ExceptionState.READY, ExceptionState.STOPPED])],
    [
      ExceptionState.READY,
      new Set([ExceptionState.RUNNING, ExceptionState.STOPPING, ExceptionState.STOPPED]),
    ],
    [ExceptionState.RUNNING, new Set([ExceptionState.STOPPING, ExceptionState.STOPPED])],
    [ExceptionState.STOPPING, new Set([ExceptionState.STOPPED])],
    [ExceptionState.STOPPED, new Set<ExceptionState>()],
  ]);

  public get state(): ExceptionState {
    return this._state;
  }

  public transitionTo(nextState: ExceptionState): void {
    if (this._state === nextState) {
      return;
    }

    const allowed = ExceptionLifecycleManager.VALID_TRANSITIONS.get(this._state);
    if (!allowed || !allowed.has(nextState)) {
      throw new ExceptionStateError(
        `Invalid Exception state transition from "${this._state}" to "${nextState}".`,
        { currentState: this._state, requestedState: nextState },
      );
    }

    this._state = nextState;
  }

  public assertCanProcess(): void {
    if (this._state === ExceptionState.STOPPING || this._state === ExceptionState.STOPPED) {
      throw new ExceptionStateError(
        `Cannot process exception: exception pipeline is in state "${this._state}".`,
        { currentState: this._state },
      );
    }
  }
}
