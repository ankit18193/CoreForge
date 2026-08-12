import { ScopeState } from './ScopeState';
import { ScopeLifecycleError } from '../errors/ScopeErrors';

export class ScopeLifecycleManager {
  private _state = ScopeState.CREATED;

  public get state(): ScopeState {
    return this._state;
  }

  public transitionTo(target: ScopeState): void {
    const allowed: Record<ScopeState, ScopeState[]> = {
      [ScopeState.CREATED]: [ScopeState.ACTIVE, ScopeState.FAILED],
      [ScopeState.ACTIVE]: [ScopeState.DISPOSING, ScopeState.FAILED],
      [ScopeState.DISPOSING]: [ScopeState.DISPOSED, ScopeState.FAILED],
      [ScopeState.DISPOSED]: [],
      [ScopeState.FAILED]: [ScopeState.DISPOSING],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new ScopeLifecycleError(
        `ScopeLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
