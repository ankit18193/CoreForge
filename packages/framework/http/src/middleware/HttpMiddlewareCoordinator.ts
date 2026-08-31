import type {
  HttpMiddleware,
  HttpMiddlewareContext,
  HttpMiddlewareDiagnosticsSnapshot,
  HttpMiddlewareOptions,
} from '@coreforge/contracts';

import { HttpMiddlewareExecutor, HttpMiddlewareExecutionOutcome } from './HttpMiddlewareExecutor';
import { HttpMiddlewareRegistry } from './HttpMiddlewareRegistry';
import { HttpMiddlewareResolver } from './HttpMiddlewareResolver';
import { HttpMiddlewareSnapshot } from './HttpMiddlewareSnapshot';
import { HttpMiddlewareDiagnostics } from '../diagnostics/HttpMiddlewareDiagnostics';

export class HttpMiddlewareCoordinator {
  private readonly _registry: HttpMiddlewareRegistry;
  private readonly _resolver: HttpMiddlewareResolver;
  private readonly _diagnostics: HttpMiddlewareDiagnostics;
  private readonly _executor: HttpMiddlewareExecutor;
  private readonly _defaultTimeoutMs?: number | undefined;

  constructor(
    registry?: HttpMiddlewareRegistry,
    diagnostics?: HttpMiddlewareDiagnostics,
    defaultTimeoutMs?: number,
  ) {
    this._registry = registry ?? new HttpMiddlewareRegistry();
    this._resolver = new HttpMiddlewareResolver(this._registry);
    this._diagnostics = diagnostics ?? new HttpMiddlewareDiagnostics();
    this._executor = new HttpMiddlewareExecutor(this._diagnostics);
    this._defaultTimeoutMs = defaultTimeoutMs;
  }

  public get registry(): HttpMiddlewareRegistry {
    return this._registry;
  }

  public get resolver(): HttpMiddlewareResolver {
    return this._resolver;
  }

  public get diagnostics(): HttpMiddlewareDiagnostics {
    return this._diagnostics;
  }

  public register<TContext = unknown, TResult = unknown>(
    middleware: HttpMiddleware<TContext, TResult>,
    options?: HttpMiddlewareOptions,
  ): this {
    try {
      this._registry.register(middleware, options);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
    return this;
  }

  public async execute<TReq = unknown, TResult = unknown>(
    context: HttpMiddlewareContext<TReq>,
    target: (ctx: HttpMiddlewareContext<TReq>) => Promise<TResult>,
    options?: { timeoutMs?: number },
  ): Promise<HttpMiddlewareExecutionOutcome<TResult>> {
    const snapshotContext = HttpMiddlewareSnapshot.createContext(context);
    const entries = this._resolver.resolveEntries();
    const timeoutMs = options?.timeoutMs ?? this._defaultTimeoutMs;

    return this._executor.execute<TReq, TResult>(snapshotContext, entries, target, timeoutMs);
  }

  public getDiagnostics(): HttpMiddlewareDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
