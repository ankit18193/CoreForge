import { TransportState } from '@coreforge/contracts';

import { TransportStateError } from '../errors/TransportErrors';

export class TransportLifecycleManager {
  private _state: TransportState = 'CREATED';
  private _activeRequests = 0;

  public get state(): TransportState {
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
      throw new TransportStateError(
        `Cannot start transport manager when in "${this._state}" state`,
      );
    }

    this._state = 'READY';
  }

  public makeReady(): void {
    this.start();
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

  public ensureCanRegister(): void {
    if (this._state !== 'CREATED') {
      throw new TransportStateError(
        `Cannot register adapters when transport manager is in "${this._state}" state`,
      );
    }
  }

  public ensureReadyForExecution(): void {
    if (this._state !== 'READY') {
      throw new TransportStateError(
        `Cannot execute transport request when transport manager is in "${this._state}" state`,
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
