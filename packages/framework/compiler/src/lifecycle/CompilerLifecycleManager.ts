import { CompilerState } from './CompilerState';
import { CompilationStateError } from '../errors/CompilerErrors';

export class CompilerLifecycleManager {
  private _state = CompilerState.CREATED;

  public get state(): CompilerState {
    return this._state;
  }

  public transitionTo(target: CompilerState): void {
    const allowed: Record<CompilerState, CompilerState[]> = {
      [CompilerState.CREATED]: [CompilerState.PLANNING, CompilerState.FAILED],
      [CompilerState.PLANNING]: [CompilerState.VALIDATING, CompilerState.FAILED],
      [CompilerState.VALIDATING]: [CompilerState.OPTIMIZING, CompilerState.FAILED],
      [CompilerState.OPTIMIZING]: [CompilerState.COMPILED, CompilerState.FAILED],
      [CompilerState.COMPILED]: [CompilerState.PLANNING, CompilerState.FAILED],
      [CompilerState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new CompilationStateError(
        `CompilerLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
