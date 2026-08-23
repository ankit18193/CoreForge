import { ParameterBindingState } from './ParameterBindingState';
import { ParameterBindingStateError } from '../errors/ParameterBindingErrors';

export class ParameterBindingLifecycleManager {
  private _state: ParameterBindingState = ParameterBindingState.CREATED;

  private static readonly VALID_TRANSITIONS: ReadonlyMap<
    ParameterBindingState,
    ReadonlySet<ParameterBindingState>
  > = new Map([
    [
      ParameterBindingState.CREATED,
      new Set([
        ParameterBindingState.COMPILING,
        ParameterBindingState.READY,
        ParameterBindingState.STOPPED,
      ]),
    ],
    [
      ParameterBindingState.COMPILING,
      new Set([ParameterBindingState.READY, ParameterBindingState.STOPPED]),
    ],
    [
      ParameterBindingState.READY,
      new Set([
        ParameterBindingState.RUNNING,
        ParameterBindingState.STOPPING,
        ParameterBindingState.STOPPED,
      ]),
    ],
    [
      ParameterBindingState.RUNNING,
      new Set([ParameterBindingState.STOPPING, ParameterBindingState.STOPPED]),
    ],
    [ParameterBindingState.STOPPING, new Set([ParameterBindingState.STOPPED])],
    [ParameterBindingState.STOPPED, new Set<ParameterBindingState>()],
  ]);

  public get state(): ParameterBindingState {
    return this._state;
  }

  public transitionTo(nextState: ParameterBindingState): void {
    if (this._state === nextState) {
      return;
    }

    const allowed = ParameterBindingLifecycleManager.VALID_TRANSITIONS.get(this._state);
    if (!allowed || !allowed.has(nextState)) {
      throw new ParameterBindingStateError(
        `Invalid ParameterBinding state transition from "${this._state}" to "${nextState}".`,
        { currentState: this._state, requestedState: nextState },
      );
    }

    this._state = nextState;
  }

  public assertCanBind(): void {
    if (
      this._state === ParameterBindingState.STOPPING ||
      this._state === ParameterBindingState.STOPPED
    ) {
      throw new ParameterBindingStateError(
        `Cannot execute parameter binding: engine is in state "${this._state}".`,
        { currentState: this._state },
      );
    }
  }
}
