import { KernelState } from './KernelState';
import { KernelStateError } from '../errors/KernelErrors';

export class KernelLifecycleManager {
  private _state = KernelState.CREATED;

  public get state(): KernelState {
    return this._state;
  }

  public transitionTo(target: KernelState): void {
    const allowed: Record<KernelState, KernelState[]> = {
      [KernelState.CREATED]: [KernelState.BUILDING, KernelState.FAILED],
      [KernelState.BUILDING]: [KernelState.VALIDATING, KernelState.FAILED],
      [KernelState.VALIDATING]: [KernelState.READY, KernelState.FAILED],
      [KernelState.READY]: [KernelState.RUNNING, KernelState.FAILED],
      [KernelState.RUNNING]: [KernelState.STOPPED, KernelState.FAILED],
      [KernelState.STOPPED]: [KernelState.RUNNING, KernelState.FAILED],
      [KernelState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new KernelStateError(
        `KernelLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
