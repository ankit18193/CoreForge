import { CancellationError, TimeoutError } from '../errors/ResilienceErrors';

export class TimeoutController {
  private readonly _combinedController = new AbortController();
  private readonly _timeoutMs?: number | undefined;
  private readonly _callerSignal?: AbortSignal | undefined;
  private _timer?: NodeJS.Timeout | undefined;
  private _callerAbortListener?: (() => void) | undefined;
  private _isTimedOut = false;
  private _isCallerCancelled = false;

  constructor(timeoutMs?: number, callerSignal?: AbortSignal) {
    this._timeoutMs = timeoutMs;
    this._callerSignal = callerSignal;

    if (this._callerSignal) {
      if (this._callerSignal.aborted) {
        this._isCallerCancelled = true;
        this._combinedController.abort();
      } else {
        this._callerAbortListener = (): void => {
          this._isCallerCancelled = true;
          this.cleanup();
          this._combinedController.abort();
        };
        this._callerSignal.addEventListener('abort', this._callerAbortListener, { once: true });
      }
    }

    if (this._timeoutMs !== undefined && this._timeoutMs > 0 && !this._isCallerCancelled) {
      this._timer = setTimeout(() => {
        this._isTimedOut = true;
        this.cleanup();
        this._combinedController.abort();
      }, this._timeoutMs);
    }
  }

  public get signal(): AbortSignal {
    return this._combinedController.signal;
  }

  public get isTimedOut(): boolean {
    return this._isTimedOut;
  }

  public get isCallerCancelled(): boolean {
    return this._isCallerCancelled;
  }

  public cleanup(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }

    if (this._callerSignal && this._callerAbortListener) {
      this._callerSignal.removeEventListener('abort', this._callerAbortListener);
      this._callerAbortListener = undefined;
    }
  }

  public checkErrors(): void {
    if (this._isCallerCancelled) {
      throw new CancellationError('Operation was cancelled by caller AbortSignal');
    }

    if (this._isTimedOut) {
      throw new TimeoutError(`Operation timed out after ${this._timeoutMs}ms`, {
        timeoutMs: this._timeoutMs,
      });
    }
  }
}
