import { RequestCancellationManager } from '../cancellation/RequestCancellationManager';
import { RequestLifecycleManager } from '../lifecycle/RequestLifecycleManager';
import { RequestLifecycleState } from '../lifecycle/RequestLifecycleState';
import {
  InjectionToken,
  RequestContext as IRequestContext,
  RequestContextOptions,
  RequestContextSnapshot,
  RequestScope,
} from '../types/requestContextTypes';

export class RequestContext implements IRequestContext {
  public readonly id: string;
  public readonly correlationId: string;
  public readonly traceId?: string | undefined;
  public readonly startTime: number;
  public readonly scope: RequestScope;

  private readonly _attributes = new Map<string, unknown>();
  private readonly _lifecycleManager: RequestLifecycleManager;
  private readonly _cancellationManager: RequestCancellationManager;
  private _disposePromise?: Promise<void> | undefined;

  constructor(scope: RequestScope, options: RequestContextOptions = {}) {
    this.scope = scope;
    this.startTime = Date.now();

    this.id = options.id || `req-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
    this.correlationId = options.correlationId || this.id;
    this.traceId = options.traceId;

    this._lifecycleManager = new RequestLifecycleManager(this.id);
    this._cancellationManager = new RequestCancellationManager(
      this.id,
      options.timeoutMs,
      options.signal,
    );

    if (options.attributes) {
      for (const [k, v] of Object.entries(options.attributes)) {
        this._attributes.set(k, v);
      }
    }

    this._lifecycleManager.transitionTo(RequestLifecycleState.ACTIVE);
  }

  public get state(): RequestLifecycleState {
    return this._lifecycleManager.state;
  }

  public get signal(): AbortSignal {
    return this._cancellationManager.signal;
  }

  public get isCancelled(): boolean {
    return this._cancellationManager.isCancelled;
  }

  public get isTimedOut(): boolean {
    return this._cancellationManager.isTimedOut;
  }

  public get isDisposed(): boolean {
    return (
      this._lifecycleManager.state === RequestLifecycleState.DISPOSING ||
      this._lifecycleManager.state === RequestLifecycleState.DISPOSED
    );
  }

  public async resolve<T>(token: InjectionToken<T>): Promise<T> {
    this._lifecycleManager.assertActive();
    this._cancellationManager.throwIfAborted();
    return this.scope.resolve(token);
  }

  public get<T>(key: string): T | undefined {
    this._lifecycleManager.assertNotDisposed();
    return this._attributes.get(key) as T | undefined;
  }

  public set<T>(key: string, value: T): void {
    this._lifecycleManager.assertActive();
    this._attributes.set(key, value);
  }

  public has(key: string): boolean {
    this._lifecycleManager.assertNotDisposed();
    return this._attributes.has(key);
  }

  public delete(key: string): boolean {
    this._lifecycleManager.assertActive();
    return this._attributes.delete(key);
  }

  public cancel(reason?: string): void {
    this._cancellationManager.cancel(reason);
  }

  public throwIfAborted(): void {
    this._cancellationManager.throwIfAborted();
  }

  public dispose(): Promise<void> {
    if (this._disposePromise) {
      return this._disposePromise;
    }
    this._disposePromise = this._executeDispose();
    return this._disposePromise;
  }

  private async _executeDispose(): Promise<void> {
    try {
      this._lifecycleManager.transitionTo(RequestLifecycleState.DISPOSING);
    } catch {
      // Already disposing or in a terminal state
    }

    try {
      this._cancellationManager.dispose();
      await this.scope.dispose();
    } finally {
      this._attributes.clear();
      try {
        this._lifecycleManager.transitionTo(RequestLifecycleState.DISPOSED);
      } catch {
        // Ignore if already transitioned
      }
    }
  }

  public snapshot(): RequestContextSnapshot {
    const duration = Date.now() - this.startTime;
    const snap: RequestContextSnapshot = {
      id: this.id,
      correlationId: this.correlationId,
      traceId: this.traceId,
      startTime: this.startTime,
      durationMs: duration,
      state: this.state,
      isDisposed: this.isDisposed,
      isCancelled: this.isCancelled,
      isTimedOut: this.isTimedOut,
      attributeCount: this._attributes.size,
    };
    return Object.freeze(snap);
  }
}
