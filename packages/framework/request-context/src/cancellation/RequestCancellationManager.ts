import { ContextCancelledError, ContextTimeoutError } from '../errors/RequestContextErrors';

export class RequestCancellationManager {
  private readonly _controller: AbortController = new AbortController();
  private readonly _contextId: string;
  private readonly _timeoutMs?: number | undefined;
  private _timer?: NodeJS.Timeout | undefined;
  private _isTimedOut = false;
  private _isCancelled = false;
  private _cancellationReason?: string | undefined;
  private _parentListener?: (() => void) | undefined;
  private _parentSignal?: AbortSignal | undefined;

  constructor(contextId: string, timeoutMs?: number, parentSignal?: AbortSignal) {
    this._contextId = contextId;
    this._timeoutMs = timeoutMs;
    this._parentSignal = parentSignal;

    if (parentSignal) {
      if (parentSignal.aborted) {
        this._isCancelled = true;
        this._cancellationReason = 'Parent signal already aborted';
        this._controller.abort(this._cancellationReason);
      } else {
        this._parentListener = () => {
          this._isCancelled = true;
          this._cancellationReason = 'External abort signal triggered';
          this._controller.abort(this._cancellationReason);
        };
        parentSignal.addEventListener('abort', this._parentListener, { once: true });
      }
    }

    if (timeoutMs !== undefined && timeoutMs > 0 && !this._controller.signal.aborted) {
      this._timer = setTimeout(() => {
        this._isTimedOut = true;
        this._controller.abort('TIMEOUT');
      }, timeoutMs);
      if (this._timer.unref) {
        this._timer.unref();
      }
    }
  }

  public get signal(): AbortSignal {
    return this._controller.signal;
  }

  public get isTimedOut(): boolean {
    return this._isTimedOut;
  }

  public get isCancelled(): boolean {
    return this._isCancelled || (this._controller.signal.aborted && !this._isTimedOut);
  }

  public throwIfAborted(): void {
    if (this._isTimedOut) {
      throw new ContextTimeoutError(this._contextId, this._timeoutMs || 0);
    }
    if (this.isCancelled) {
      throw new ContextCancelledError(this._contextId, this._cancellationReason);
    }
  }

  public cancel(reason?: string): void {
    if (this._controller.signal.aborted) {
      return;
    }
    this._isCancelled = true;
    this._cancellationReason = reason;
    this._controller.abort(reason);
  }

  public dispose(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    if (this._parentSignal && this._parentListener) {
      this._parentSignal.removeEventListener('abort', this._parentListener);
      this._parentListener = undefined;
    }
  }
}
