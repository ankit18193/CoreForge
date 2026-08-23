import { ExecutionState } from './ExecutionState';
import { ExecutionStateError } from '../errors/ExecutionErrors';

export class ExecutionLifecycleManager {
  private _state: ExecutionState = ExecutionState.CREATED;

  private static readonly VALID_TRANSITIONS: ReadonlyMap<
    ExecutionState,
    ReadonlySet<ExecutionState>
  > = new Map([
    [ExecutionState.CREATED, new Set([ExecutionState.READY, ExecutionState.STOPPED])],
    [
      ExecutionState.READY,
      new Set([ExecutionState.RUNNING, ExecutionState.STOPPING, ExecutionState.STOPPED]),
    ],
    [ExecutionState.RUNNING, new Set([ExecutionState.STOPPING, ExecutionState.STOPPED])],
    [ExecutionState.STOPPING, new Set([ExecutionState.STOPPED])],
    [ExecutionState.STOPPED, new Set<ExecutionState>()],
  ]);

  public get state(): ExecutionState {
    return this._state;
  }

  public transitionTo(nextState: ExecutionState): void {
    if (this._state === nextState) {
      return;
    }

    const allowed = ExecutionLifecycleManager.VALID_TRANSITIONS.get(this._state);
    if (!allowed || !allowed.has(nextState)) {
      throw new ExecutionStateError(
        `Invalid Execution state transition from "${this._state}" to "${nextState}".`,
        { currentState: this._state, requestedState: nextState },
      );
    }

    this._state = nextState;
  }

  public assertCanExecute(): void {
    if (this._state === ExecutionState.STOPPING || this._state === ExecutionState.STOPPED) {
      throw new ExecutionStateError(
        `Cannot execute action: execution engine is in state "${this._state}".`,
        { currentState: this._state },
      );
    }
  }
}
