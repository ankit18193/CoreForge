import { CoreForgeError } from '@coreforge/errors';

import { RuntimeState } from './RuntimeState';

export class StateMachine {
  private _state: RuntimeState = RuntimeState.CREATED;
  private _transitioning = false;

  public get state(): RuntimeState {
    return this._state;
  }

  public get isTransitioning(): boolean {
    return this._transitioning;
  }

  public transitionTo(target: RuntimeState): void {
    if (this._transitioning) {
      throw new CoreForgeError(
        `Cannot transition to ${target} because a lifecycle transition is already in progress.`,
        'INVALID_STATE_TRANSITION',
      );
    }

    if (!this.isValidTransition(this._state, target)) {
      const prev = this._state;
      this._state = RuntimeState.FAILED;
      throw new CoreForgeError(
        `Invalid state transition: ${prev} -> ${target}`,
        'INVALID_STATE_TRANSITION',
      );
    }

    this._state = target;
  }

  public startTransition(target: RuntimeState): void {
    if (this._transitioning) {
      throw new CoreForgeError(
        `Cannot start transition to ${target} because a transition is already active.`,
        'CONCURRENT_LIFECYCLE_OPERATION',
      );
    }

    if (!this.isValidTransition(this._state, target)) {
      const prev = this._state;
      this._state = RuntimeState.FAILED;
      throw new CoreForgeError(
        `Invalid transition path: ${prev} -> ${target}`,
        'INVALID_STATE_TRANSITION',
      );
    }

    this._transitioning = true;
  }

  public endTransition(target: RuntimeState): void {
    this._transitioning = false;
    this._state = target;
  }

  public failTransition(): void {
    this._transitioning = false;
    this._state = RuntimeState.FAILED;
  }

  private isValidTransition(from: RuntimeState, to: RuntimeState): boolean {
    switch (from) {
      case RuntimeState.CREATED:
        return to === RuntimeState.BOOTSTRAPPING || to === RuntimeState.FAILED;
      case RuntimeState.BOOTSTRAPPING:
        return to === RuntimeState.STARTING || to === RuntimeState.FAILED;
      case RuntimeState.STARTING:
        return to === RuntimeState.RUNNING || to === RuntimeState.FAILED;
      case RuntimeState.RUNNING:
        return to === RuntimeState.STOPPING || to === RuntimeState.FAILED;
      case RuntimeState.STOPPING:
        return to === RuntimeState.STOPPED || to === RuntimeState.FAILED;
      case RuntimeState.STOPPED:
        return to === RuntimeState.STARTING || to === RuntimeState.FAILED;
      case RuntimeState.FAILED:
        return (
          to === RuntimeState.BOOTSTRAPPING ||
          to === RuntimeState.STOPPING ||
          to === RuntimeState.STOPPED
        );
      default:
        return false;
    }
  }
}
