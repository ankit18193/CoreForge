import { ExceptionDiagnostics } from '../diagnostics/ExceptionDiagnostics';
import { ExceptionHandlerRegistry } from '../handler/ExceptionHandlerRegistry';
import { ExceptionHandlerResolver } from '../handler/ExceptionHandlerResolver';
import { FallbackExceptionHandler } from '../handler/FallbackExceptionHandler';
import { ExceptionProfiler } from '../internal/ExceptionProfiler';
import { ExceptionLifecycleManager } from '../lifecycle/ExceptionLifecycleManager';
import { ExceptionState } from '../lifecycle/ExceptionState';
import { ErrorNormalizer } from '../normalization/ErrorNormalizer';
import {
  ErrorDescriptor,
  ExceptionContext,
  ExceptionDiagnosticsSnapshot,
  ExceptionPipeline as IExceptionPipeline,
  ExceptionPipelineOptions,
} from '../types/exceptionTypes';

export class ExceptionPipeline implements IExceptionPipeline {
  private readonly _registry: ExceptionHandlerRegistry;
  private readonly _resolver: ExceptionHandlerResolver;
  private readonly _fallback: FallbackExceptionHandler;
  private readonly _lifecycle = new ExceptionLifecycleManager();
  private readonly _diagnostics = new ExceptionDiagnostics();
  private readonly _options: ExceptionPipelineOptions;
  private readonly _enableDiagnostics: boolean;

  constructor(
    options: {
      registry?: ExceptionHandlerRegistry;
      pipelineOptions?: ExceptionPipelineOptions;
      enableDiagnostics?: boolean;
    } = {},
  ) {
    this._options = options.pipelineOptions || {};
    this._enableDiagnostics = options.enableDiagnostics ?? true;
    this._registry = options.registry || new ExceptionHandlerRegistry();
    this._fallback = new FallbackExceptionHandler(this._options);
    this._resolver = new ExceptionHandlerResolver(this._registry, this._fallback);
    this._lifecycle.transitionTo(ExceptionState.READY);
  }

  public get registry(): ExceptionHandlerRegistry {
    return this._registry;
  }

  public get state(): ExceptionState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ExceptionDiagnosticsSnapshot {
    return this._diagnostics.snapshot();
  }

  public start(): void {
    this._lifecycle.transitionTo(ExceptionState.RUNNING);
  }

  public stop(): void {
    if (this._lifecycle.state !== ExceptionState.STOPPED) {
      this._lifecycle.transitionTo(ExceptionState.STOPPING);
      this._lifecycle.transitionTo(ExceptionState.STOPPED);
    }
  }

  public async handle(error: unknown, context: ExceptionContext): Promise<ErrorDescriptor> {
    this._lifecycle.assertCanProcess();

    const profiler = new ExceptionProfiler();
    profiler.start();

    let descriptor: ErrorDescriptor;
    let isFallback = false;

    try {
      const handler = await this._resolver.resolve(error, context);
      isFallback = handler === this._fallback;

      try {
        const handlerResult = await Promise.resolve(handler.handle(error, context));
        descriptor = ErrorNormalizer.normalize(handlerResult, this._options);
      } catch (handlerErr) {
        // Handler execution failed -> record failure and invoke fallback handler
        const failureDuration = profiler.durationMs;
        if (this._enableDiagnostics) {
          this._diagnostics.recordHandlerFailure(failureDuration);
        }
        isFallback = true;
        descriptor = await Promise.resolve(this._fallback.handle(error, context));
      }
    } catch {
      // Resolver or pipeline failure -> fallback
      isFallback = true;
      descriptor = await Promise.resolve(this._fallback.handle(error, context));
    }

    const duration = profiler.stop();
    if (this._enableDiagnostics) {
      this._diagnostics.recordSuccess(descriptor.category, descriptor.code, duration, isFallback);
    }

    return descriptor;
  }
}
