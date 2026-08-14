import { PluginState } from './PluginState';
import { PluginStateError } from '../errors/PluginErrors';

export class PluginLifecycleManager {
  private _state = PluginState.CREATED;

  public get state(): PluginState {
    return this._state;
  }

  public transitionTo(target: PluginState): void {
    const allowed: Record<PluginState, PluginState[]> = {
      [PluginState.CREATED]: [PluginState.REGISTERED, PluginState.FAILED],
      [PluginState.REGISTERED]: [PluginState.LOADING, PluginState.FAILED],
      [PluginState.LOADING]: [PluginState.LOADED, PluginState.FAILED],
      [PluginState.LOADED]: [PluginState.ENABLED, PluginState.FAILED],
      [PluginState.ENABLED]: [PluginState.DISABLED, PluginState.FAILED],
      [PluginState.DISABLED]: [PluginState.ENABLED, PluginState.FAILED],
      [PluginState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new PluginStateError(
        `PluginLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
