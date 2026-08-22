import { DependencyState } from './DependencyState';
import { ContainerStateError } from '../errors/DependencyErrors';

export class DependencyLifecycleManager {
  private _state: DependencyState = DependencyState.CREATED;

  private static readonly VALID_TRANSITIONS: ReadonlyMap<
    DependencyState,
    ReadonlySet<DependencyState>
  > = new Map([
    [DependencyState.CREATED, new Set([DependencyState.REGISTERING, DependencyState.READY])],
    [DependencyState.REGISTERING, new Set([DependencyState.READY, DependencyState.STOPPING])],
    [DependencyState.READY, new Set([DependencyState.RUNNING, DependencyState.STOPPING])],
    [DependencyState.RUNNING, new Set([DependencyState.STOPPING])],
    [DependencyState.STOPPING, new Set([DependencyState.STOPPED])],
    [DependencyState.STOPPED, new Set<DependencyState>()],
  ]);

  public get state(): DependencyState {
    return this._state;
  }

  public transitionTo(nextState: DependencyState): void {
    if (this._state === nextState) {
      return;
    }

    const allowed = DependencyLifecycleManager.VALID_TRANSITIONS.get(this._state);
    if (!allowed || !allowed.has(nextState)) {
      throw new ContainerStateError(
        `Invalid lifecycle transition from ${this._state} to ${nextState}.`,
        { currentState: this._state, requestedState: nextState },
      );
    }

    this._state = nextState;
  }

  public assertCanRegister(): void {
    if (this._state !== DependencyState.CREATED && this._state !== DependencyState.REGISTERING) {
      throw new ContainerStateError(
        `Cannot register providers in state "${this._state}". Provider registration is only allowed during CREATED or REGISTERING states.`,
        { currentState: this._state },
      );
    }
  }

  public assertCanResolve(): void {
    if (this._state !== DependencyState.READY && this._state !== DependencyState.RUNNING) {
      throw new ContainerStateError(
        `Cannot resolve dependencies in state "${this._state}". Resolution is only permitted in READY or RUNNING states.`,
        { currentState: this._state },
      );
    }
  }
}
