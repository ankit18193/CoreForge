import { DecoratorState } from './DecoratorState';
import { DecoratorStateError } from '../errors/DecoratorErrors';

export class DecoratorLifecycleManager {
  private _state = DecoratorState.CREATED;

  public get state(): DecoratorState {
    return this._state;
  }

  public transitionTo(target: DecoratorState): void {
    const allowed: Record<DecoratorState, DecoratorState[]> = {
      [DecoratorState.CREATED]: [DecoratorState.REGISTERING],
      [DecoratorState.REGISTERING]: [DecoratorState.READY, DecoratorState.STOPPED],
      [DecoratorState.READY]: [DecoratorState.STOPPED, DecoratorState.REGISTERING],
      [DecoratorState.STOPPED]: [DecoratorState.REGISTERING, DecoratorState.CREATED],
    };

    const next = allowed[this._state];
    if (!next || !next.includes(target)) {
      throw new DecoratorStateError(
        `DecoratorLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }

  public reset(): void {
    this._state = DecoratorState.CREATED;
  }
}
