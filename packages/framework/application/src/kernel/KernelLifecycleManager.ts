import { KernelState } from './KernelState';
import { ApplicationStateError } from '../errors/ApplicationErrors';

export class KernelLifecycleManager {
  private _state = KernelState.CREATED;

  public get state(): KernelState {
    return this._state;
  }

  public transitionTo(target: KernelState): void {
    const allowed: Record<KernelState, KernelState[]> = {
      [KernelState.CREATED]: [KernelState.BUILDING, KernelState.FAILED],
      [KernelState.BUILDING]: [KernelState.INITIALIZED, KernelState.FAILED],
      [KernelState.INITIALIZED]: [KernelState.STARTING, KernelState.FAILED],
      [KernelState.STARTING]: [KernelState.RUNNING, KernelState.FAILED],
      [KernelState.RUNNING]: [KernelState.STOPPING, KernelState.FAILED],
      [KernelState.STOPPING]: [KernelState.STOPPED, KernelState.FAILED],
      [KernelState.STOPPED]: [KernelState.STARTING, KernelState.FAILED],
      [KernelState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new ApplicationStateError(
        `KernelLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
