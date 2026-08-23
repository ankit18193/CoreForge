import { Container } from '@coreforge/di';
import { ExceptionPipeline } from '@coreforge/exceptions';
import { ExecutionEngine } from '@coreforge/execution';
import { MetadataRegistry } from '@coreforge/metadata';
import { ParameterBindingResolver } from '@coreforge/parameter-binding';
import { RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';
import { RouteMatcher } from '@coreforge/routing';
import { TransportPipeline } from '@coreforge/transport';

import { RuntimeConfigurationError, RuntimeStateError } from '../errors/RuntimeErrors';

export interface RuntimeComponents {
  readonly metadataRegistry?: MetadataRegistry | undefined;
  readonly container?: Container | undefined;
  readonly requestContextManager?: RequestContextManager | undefined;
  readonly parameterBindingResolver?: ParameterBindingResolver | undefined;
  readonly routeMatcher?: RouteMatcher | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly responseProcessor?: ResponseProcessor | undefined;
  readonly exceptionPipeline?: ExceptionPipeline | undefined;
  readonly transportPipeline?: TransportPipeline | undefined;
}

export class RuntimeComponentRegistry {
  private _metadataRegistry?: MetadataRegistry | undefined;
  private _container?: Container | undefined;
  private _requestContextManager?: RequestContextManager | undefined;
  private _parameterBindingResolver?: ParameterBindingResolver | undefined;
  private _routeMatcher?: RouteMatcher | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _responseProcessor?: ResponseProcessor | undefined;
  private _exceptionPipeline?: ExceptionPipeline | undefined;
  private _transportPipeline?: TransportPipeline | undefined;
  private _isLocked = false;

  public lock(): void {
    this._isLocked = true;
  }

  public get isLocked(): boolean {
    return this._isLocked;
  }

  public setMetadataRegistry(registry: MetadataRegistry): this {
    this._ensureNotLocked();
    this._metadataRegistry = registry;
    return this;
  }

  public get metadataRegistry(): MetadataRegistry | undefined {
    return this._metadataRegistry;
  }

  public setContainer(container: Container): this {
    this._ensureNotLocked();
    this._container = container;
    return this;
  }

  public get container(): Container | undefined {
    return this._container;
  }

  public setRequestContextManager(manager: RequestContextManager): this {
    this._ensureNotLocked();
    this._requestContextManager = manager;
    return this;
  }

  public get requestContextManager(): RequestContextManager | undefined {
    return this._requestContextManager;
  }

  public setParameterBindingResolver(resolver: ParameterBindingResolver): this {
    this._ensureNotLocked();
    this._parameterBindingResolver = resolver;
    return this;
  }

  public get parameterBindingResolver(): ParameterBindingResolver | undefined {
    return this._parameterBindingResolver;
  }

  public setRouteMatcher(matcher: RouteMatcher): this {
    this._ensureNotLocked();
    this._routeMatcher = matcher;
    return this;
  }

  public get routeMatcher(): RouteMatcher | undefined {
    return this._routeMatcher;
  }

  public setExecutionEngine(engine: ExecutionEngine): this {
    this._ensureNotLocked();
    this._executionEngine = engine;
    return this;
  }

  public get executionEngine(): ExecutionEngine | undefined {
    return this._executionEngine;
  }

  public setResponseProcessor(processor: ResponseProcessor): this {
    this._ensureNotLocked();
    this._responseProcessor = processor;
    return this;
  }

  public get responseProcessor(): ResponseProcessor | undefined {
    return this._responseProcessor;
  }

  public setExceptionPipeline(pipeline: ExceptionPipeline): this {
    this._ensureNotLocked();
    this._exceptionPipeline = pipeline;
    return this;
  }

  public get exceptionPipeline(): ExceptionPipeline | undefined {
    return this._exceptionPipeline;
  }

  public setTransportPipeline(pipeline: TransportPipeline): this {
    this._ensureNotLocked();
    this._transportPipeline = pipeline;
    return this;
  }

  public get transportPipeline(): TransportPipeline | undefined {
    return this._transportPipeline;
  }

  public snapshot(): RuntimeComponents {
    return Object.freeze({
      metadataRegistry: this._metadataRegistry,
      container: this._container,
      requestContextManager: this._requestContextManager,
      parameterBindingResolver: this._parameterBindingResolver,
      routeMatcher: this._routeMatcher,
      executionEngine: this._executionEngine,
      responseProcessor: this._responseProcessor,
      exceptionPipeline: this._exceptionPipeline,
      transportPipeline: this._transportPipeline,
    });
  }

  public validateRequired(): void {
    if (!this._requestContextManager) {
      throw new RuntimeConfigurationError(
        'RequestContextManager is required in RuntimeComponentRegistry.',
      );
    }
    if (!this._executionEngine) {
      throw new RuntimeConfigurationError(
        'ExecutionEngine is required in RuntimeComponentRegistry.',
      );
    }
    if (!this._responseProcessor) {
      throw new RuntimeConfigurationError(
        'ResponseProcessor is required in RuntimeComponentRegistry.',
      );
    }
    if (!this._exceptionPipeline) {
      throw new RuntimeConfigurationError(
        'ExceptionPipeline is required in RuntimeComponentRegistry.',
      );
    }
    if (!this._transportPipeline) {
      throw new RuntimeConfigurationError(
        'TransportPipeline is required in RuntimeComponentRegistry.',
      );
    }
  }

  private _ensureNotLocked(): void {
    if (this._isLocked) {
      throw new RuntimeStateError(
        'Cannot modify RuntimeComponentRegistry after application startup has been locked.',
      );
    }
  }
}
