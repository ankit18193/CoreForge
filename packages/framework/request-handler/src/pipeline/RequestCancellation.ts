import { EventEmitter } from 'node:events';

export class RequestCancellation {
  private readonly _emitter = new EventEmitter();
  private _cancelled = false;
  private _reason?: string | undefined;

  public get isCancelled(): boolean {
    return this._cancelled;
  }

  public get reason(): string | undefined {
    return this._reason;
  }

  public cancel(reason = 'Request was cancelled'): void {
    if (this._cancelled) {
      return;
    }
    this._cancelled = true;
    this._reason = reason;
    this._emitter.emit('cancel', reason);
  }

  public onCancel(listener: (reason: string) => void): () => void {
    this._emitter.on('cancel', listener);
    return () => {
      this._emitter.off('cancel', listener);
    };
  }

  public throwIfCancelled(): void {
    if (this._cancelled) {
      throw new Error(`CancellationException: ${this._reason || 'Cancelled'}`);
    }
  }
}
