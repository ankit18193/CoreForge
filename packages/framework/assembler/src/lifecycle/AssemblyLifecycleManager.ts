import { AssemblyState } from './AssemblyState';
import { AssemblyStateError } from '../errors/AssemblyErrors';

export class AssemblyLifecycleManager {
  private _state = AssemblyState.CREATED;

  public get state(): AssemblyState {
    return this._state;
  }

  public transitionTo(target: AssemblyState): void {
    const allowed: Record<AssemblyState, AssemblyState[]> = {
      [AssemblyState.CREATED]: [AssemblyState.PLANNING, AssemblyState.FAILED],
      [AssemblyState.PLANNING]: [AssemblyState.ASSEMBLING, AssemblyState.FAILED],
      [AssemblyState.ASSEMBLING]: [AssemblyState.VALIDATING, AssemblyState.FAILED],
      [AssemblyState.VALIDATING]: [AssemblyState.READY, AssemblyState.FAILED],
      [AssemblyState.READY]: [AssemblyState.FAILED],
      [AssemblyState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new AssemblyStateError(
        `AssemblyLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
