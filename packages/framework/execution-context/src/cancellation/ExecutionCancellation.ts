export class ExecutionCancellation {
  private readonly _controller: AbortController;
  private readonly _parentSignal?: AbortSignal | undefined;
  private _parentListener?: (() => void) | undefined;
  private _disposed = false;

  constructor(parentSignal?: AbortSignal | undefined) {
    this._controller = new AbortController();
    this._parentSignal = parentSignal;

    if (this._parentSignal) {
      if (this._parentSignal.aborted) {
        this._controller.abort(this._parentSignal.reason);
      } else {
        this._parentListener = () => {
          if (!this._disposed && !this._controller.signal.aborted) {
            this._controller.abort(this._parentSignal?.reason);
          }
        };
        this._parentSignal.addEventListener('abort', this._parentListener, { once: true });
      }
    }
  }

  public get signal(): AbortSignal {
    return this._controller.signal;
  }

  public get isAborted(): boolean {
    return this._controller.signal.aborted;
  }

  public cancel(reason?: unknown): boolean {
    if (this._controller.signal.aborted) {
      return false;
    }

    this._controller.abort(reason);
    this.dispose();
    return true;
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    if (this._parentSignal && this._parentListener) {
      this._parentSignal.removeEventListener('abort', this._parentListener);
      this._parentListener = undefined;
    }
  }
}
