import { TransportState } from './TransportState';
import { TransportStateError } from '../errors/TransportErrors';

export class TransportLifecycleManager {
  private _state: TransportState = 'CREATED';
  private _activeRequests = 0;
  private _drainPromiseResolve: (() => void) | null = null;

  public get state(): TransportState {
    return this._state;
  }

  public get activeRequests(): number {
    return this._activeRequests;
  }

  public makeReady(): void {
    if (this._state !== 'CREATED') {
      throw new TransportStateError(
        `Cannot transition from ${this._state} to READY. Valid transition is from CREATED only.`,
      );
    }
    this._state = 'READY';
  }

  public start(): void {
    if (this._state === 'CREATED') {
      this._state = 'READY';
    }
    if (this._state !== 'READY') {
      throw new TransportStateError(
        `Cannot transition from ${this._state} to RUNNING. Must be in READY state.`,
      );
    }
    this._state = 'RUNNING';
  }

  public async stop(drainTimeoutMs = 10000): Promise<void> {
    if (this._state === 'STOPPED') {
      return;
    }
    if (this._state === 'STOPPING') {
      await this._waitForDrain(drainTimeoutMs);
      return;
    }

    this._state = 'STOPPING';
    await this._waitForDrain(drainTimeoutMs);
    this._state = 'STOPPED';
  }

  public acquireRequest(): void {
    if (this._state !== 'READY' && this._state !== 'RUNNING') {
      throw new TransportStateError(
        `Cannot accept new transport request while in state '${this._state}'. Transport is not running.`,
      );
    }
    this._activeRequests++;
  }

  public releaseRequest(): void {
    if (this._activeRequests > 0) {
      this._activeRequests--;
    }
    if (this._activeRequests === 0 && this._drainPromiseResolve) {
      this._drainPromiseResolve();
      this._drainPromiseResolve = null;
    }
  }

  private async _waitForDrain(timeoutMs: number): Promise<void> {
    if (this._activeRequests === 0) {
      return;
    }

    return new Promise<void>((resolve) => {
      let timer: NodeJS.Timeout | undefined;

      const finish = () => {
        if (timer) {
          clearTimeout(timer);
        }
        resolve();
      };

      this._drainPromiseResolve = finish;

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          this._drainPromiseResolve = null;
          resolve();
        }, timeoutMs);
      }
    });
  }
}
