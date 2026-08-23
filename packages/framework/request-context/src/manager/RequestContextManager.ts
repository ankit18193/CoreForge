import { RequestContextManagerOptions } from './RequestContextManagerOptions';
import { RequestContext } from '../context/RequestContext';
import { RequestContextDiagnostics } from '../diagnostics/RequestContextDiagnostics';
import { ContextCancelledError, ContextTimeoutError } from '../errors/RequestContextErrors';
import { RequestContextProfiler } from '../internal/RequestContextProfiler';
import { ContextStorage } from '../storage/ContextStorage';
import {
  RequestContextDiagnosticsSnapshot,
  RequestContextManager as IRequestContextManager,
  RequestContextOptions,
  RequestScope,
} from '../types/requestContextTypes';

export interface ScopeFactory {
  createScope(): RequestScope;
}

export class RequestContextManager implements IRequestContextManager {
  private readonly _scopeFactory: ScopeFactory;
  private readonly _options: RequestContextManagerOptions;
  private readonly _storage: ContextStorage = new ContextStorage();
  private readonly _diagnostics: RequestContextDiagnostics = new RequestContextDiagnostics();
  private readonly _activeContexts = new Map<string, RequestContext>();

  constructor(scopeFactory: ScopeFactory, options: RequestContextManagerOptions = {}) {
    this._scopeFactory = scopeFactory;
    this._options = options;
  }

  public get storage(): ContextStorage {
    return this._storage;
  }

  public get diagnostics(): RequestContextDiagnosticsSnapshot {
    return this._diagnostics.snapshot();
  }

  public get activeContextCount(): number {
    return this._activeContexts.size;
  }

  public async createContext(options: RequestContextOptions = {}): Promise<RequestContext> {
    const scope = this._scopeFactory.createScope();

    const effectiveTimeout =
      options.timeoutMs !== undefined ? options.timeoutMs : this._options.defaultTimeoutMs;

    const mergedOptions: RequestContextOptions = {
      ...options,
      timeoutMs: effectiveTimeout,
    };

    const context = new RequestContext(scope, mergedOptions);
    this._activeContexts.set(context.id, context);

    if (this._options.enableDiagnostics ?? true) {
      this._diagnostics.recordContextCreated();
    }

    return context;
  }

  public async runInContext<R>(
    optionsOrFn: RequestContextOptions | undefined | ((context: RequestContext) => Promise<R>),
    fnMaybe?: (context: RequestContext) => Promise<R>,
  ): Promise<R> {
    let options: RequestContextOptions = {};
    let fn: (context: RequestContext) => Promise<R>;

    if (typeof optionsOrFn === 'function') {
      fn = optionsOrFn;
      options = {};
    } else {
      options = optionsOrFn || {};
      fn = fnMaybe!;
    }

    const context = await this.createContext(options);
    const profiler = new RequestContextProfiler();
    profiler.start();

    return this._storage.run(context, async () => {
      try {
        const result = await fn(context);
        const duration = profiler.stop();

        if (context.isTimedOut) {
          if (this._options.enableDiagnostics ?? true) {
            this._diagnostics.recordContextTimedOut(context.id, duration);
          }
          throw new ContextTimeoutError(context.id, options.timeoutMs || 0);
        }

        if (context.isCancelled) {
          if (this._options.enableDiagnostics ?? true) {
            this._diagnostics.recordContextCancelled(context.id, duration);
          }
          throw new ContextCancelledError(context.id);
        }

        if (this._options.enableDiagnostics ?? true) {
          this._diagnostics.recordContextCompleted(context.id, duration);
        }

        return result;
      } catch (err) {
        const duration = profiler.stop();

        if (context.isTimedOut || err instanceof ContextTimeoutError) {
          if (this._options.enableDiagnostics ?? true) {
            this._diagnostics.recordContextTimedOut(context.id, duration);
          }
        } else if (context.isCancelled) {
          if (this._options.enableDiagnostics ?? true) {
            this._diagnostics.recordContextCancelled(context.id, duration);
          }
        } else {
          if (this._options.enableDiagnostics ?? true) {
            this._diagnostics.recordContextFailed(context.id, duration);
          }
        }

        throw err;
      } finally {
        this._activeContexts.delete(context.id);
        await context.dispose();
      }
    });
  }

  public getCurrentContext(): RequestContext | undefined {
    return this._storage.getStore();
  }

  public async disposeAll(): Promise<void> {
    const contexts = Array.from(this._activeContexts.values());
    for (const ctx of contexts) {
      await ctx.dispose();
    }
    this._activeContexts.clear();
  }
}
