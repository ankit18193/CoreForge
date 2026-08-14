import { ExtensionState } from './ExtensionState';
import { ExtensionStateError } from '../errors/ExtensionErrors';

export class ExtensionLifecycleManager {
  private _state = ExtensionState.CREATED;

  public get state(): ExtensionState {
    return this._state;
  }

  public transitionTo(target: ExtensionState): void {
    const allowed: Record<ExtensionState, ExtensionState[]> = {
      [ExtensionState.CREATED]: [ExtensionState.LOADING, ExtensionState.FAILED],
      [ExtensionState.LOADING]: [ExtensionState.LOADED, ExtensionState.FAILED],
      [ExtensionState.LOADED]: [ExtensionState.ENABLED, ExtensionState.FAILED],
      [ExtensionState.ENABLED]: [ExtensionState.DISABLED, ExtensionState.FAILED],
      [ExtensionState.DISABLED]: [ExtensionState.ENABLED, ExtensionState.FAILED],
      [ExtensionState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new ExtensionStateError(
        `ExtensionLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
