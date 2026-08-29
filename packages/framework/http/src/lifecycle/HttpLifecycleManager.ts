import { HttpState } from './HttpState';
import { HttpStateError } from '../errors/HttpErrors';

export class HttpLifecycleManager {
  private _state: HttpState = 'CREATED';
  private _activeRequests = 0;

  public get state(): HttpState {
    return this._state;
  }

  public get isReady(): boolean {
    return this._state === 'READY';
  }

  public get activeRequests(): number {
    return this._activeRequests;
  }

  public start(): void {
    if (this._state === 'READY') {
      return;
    }

    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new HttpStateError(`Cannot start HTTP transport when in "${this._state}" state`);
    }

    this._state = 'READY';
  }

  public async stop(timeoutMs = 5000): Promise<void> {
    if (this._state === 'STOPPED') {
      return;
    }

    if (this._state === 'CREATED') {
      this._state = 'STOPPED';
      return;
    }

    this._state = 'STOPPING';

    await this.waitForDrain(timeoutMs);

    this._state = 'STOPPED';
  }

  public ensureReadyForExecution(): void {
    if (this._state !== 'READY') {
      throw new HttpStateError(
        `Cannot execute HTTP request when HTTP transport is in "${this._state}" state`,
      );
    }
  }

  public acquireRequest(): void {
    this.ensureReadyForExecution();
    this._activeRequests++;
  }

  public releaseRequest(): void {
    this._activeRequests = Math.max(0, this._activeRequests - 1);
  }

  public async waitForDrain(timeoutMs = 5000): Promise<void> {
    if (this._activeRequests === 0) {
      return;
    }

    const startTime = Date.now();
    const intervalMs = 10;

    while (this._activeRequests > 0) {
      if (Date.now() - startTime >= timeoutMs) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
