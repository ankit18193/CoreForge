import { RuntimeState } from './RuntimeState';
import { RuntimeStateError } from '../errors/RuntimeErrors';

export class RuntimeLifecycleManager {
  private _state: RuntimeState = 'CREATED';
  private _startedAt?: number | undefined;
  private _stoppedAt?: number | undefined;
  private _activeRequests = 0;

  public get state(): RuntimeState {
    return this._state;
  }

  public get ready(): boolean {
    return this._state === 'READY';
  }

  public get startedAt(): number | undefined {
    return this._startedAt;
  }

  public get stoppedAt(): number | undefined {
    return this._stoppedAt;
  }

  public get activeRequests(): number {
    return this._activeRequests;
  }

  public setValidating(): void {
    if (this._state !== 'CREATED') {
      throw new RuntimeStateError(
        `Cannot transition to VALIDATING from state '${this._state}'. Must be CREATED.`,
      );
    }
    this._state = 'VALIDATING';
  }

  public setCompiling(): void {
    if (this._state !== 'VALIDATING') {
      throw new RuntimeStateError(
        `Cannot transition to COMPILING from state '${this._state}'. Must be VALIDATING.`,
      );
    }
    this._state = 'COMPILING';
  }

  public setInitializing(): void {
    if (this._state !== 'COMPILING') {
      throw new RuntimeStateError(
        `Cannot transition to INITIALIZING from state '${this._state}'. Must be COMPILING.`,
      );
    }
    this._state = 'INITIALIZING';
  }

  public setReady(): void {
    if (this._state !== 'INITIALIZING') {
      throw new RuntimeStateError(
        `Cannot transition to READY from state '${this._state}'. Must be INITIALIZING.`,
      );
    }
    this._state = 'READY';
    this._startedAt = Date.now();
  }

  public setStopping(): void {
    if (this._state === 'STOPPED' || this._state === 'STOPPING') {
      return;
    }
    if (this._state !== 'READY' && this._state !== 'FAILED') {
      throw new RuntimeStateError(`Cannot transition to STOPPING from state '${this._state}'.`);
    }
    this._state = 'STOPPING';
  }

  public setStopped(): void {
    if (this._state === 'STOPPED') {
      return;
    }
    this._state = 'STOPPED';
    this._stoppedAt = Date.now();
  }

  public setFailed(): void {
    this._state = 'FAILED';
  }

  public acquireRequest(): void {
    if (this._state !== 'READY') {
      throw new RuntimeStateError(
        `Cannot process requests while runtime is in state '${this._state}'. Must be READY.`,
      );
    }
    this._activeRequests++;
  }

  public releaseRequest(): void {
    if (this._activeRequests > 0) {
      this._activeRequests--;
    }
  }

  public async waitForDrain(timeoutMs = 5000): Promise<void> {
    if (this._activeRequests === 0) {
      return;
    }

    const start = Date.now();
    while (this._activeRequests > 0) {
      if (Date.now() - start > timeoutMs) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}
