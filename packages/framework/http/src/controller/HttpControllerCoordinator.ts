import type {
  HttpController,
  HttpControllerContext,
  HttpControllerDiagnosticsSnapshot,
  HttpControllerResult,
  HttpEndpoint,
  HttpEndpointOptions,
} from '@coreforge/contracts';

import { HttpControllerExecutor, HttpControllerExecutionOptions } from './HttpControllerExecutor';
import { HttpControllerRegistry } from './HttpControllerRegistry';
import { HttpControllerResolver } from './HttpControllerResolver';
import { HttpControllerDiagnostics } from '../diagnostics/HttpControllerDiagnostics';
import { HttpEndpointRegistry } from '../endpoint/HttpEndpointRegistry';
import { HttpEndpointResolver } from '../endpoint/HttpEndpointResolver';
import {
  HttpControllerExecutionError,
  HttpEndpointNotFoundError,
} from '../errors/HttpControllerErrors';

export class HttpControllerCoordinator {
  private readonly _controllerRegistry: HttpControllerRegistry;
  private readonly _endpointRegistry: HttpEndpointRegistry;
  private readonly _controllerResolver: HttpControllerResolver;
  private readonly _endpointResolver: HttpEndpointResolver;
  private readonly _diagnostics: HttpControllerDiagnostics;
  private readonly _executor: HttpControllerExecutor;
  private readonly _defaultTimeoutMs?: number | undefined;

  constructor(
    controllerRegistry?: HttpControllerRegistry,
    endpointRegistry?: HttpEndpointRegistry,
    diagnostics?: HttpControllerDiagnostics,
    defaultTimeoutMs?: number,
  ) {
    this._controllerRegistry = controllerRegistry ?? new HttpControllerRegistry();
    this._endpointRegistry = endpointRegistry ?? new HttpEndpointRegistry();
    this._controllerResolver = new HttpControllerResolver(this._controllerRegistry);
    this._endpointResolver = new HttpEndpointResolver(this._endpointRegistry);
    this._diagnostics = diagnostics ?? new HttpControllerDiagnostics();
    this._executor = new HttpControllerExecutor(this._diagnostics);
    this._defaultTimeoutMs = defaultTimeoutMs;
  }

  public get controllerRegistry(): HttpControllerRegistry {
    return this._controllerRegistry;
  }

  public get endpointRegistry(): HttpEndpointRegistry {
    return this._endpointRegistry;
  }

  public get controllerResolver(): HttpControllerResolver {
    return this._controllerResolver;
  }

  public get endpointResolver(): HttpEndpointResolver {
    return this._endpointResolver;
  }

  public get diagnostics(): HttpControllerDiagnostics {
    return this._diagnostics;
  }

  public registerController(controller: HttpController, priority?: number): this {
    try {
      this._controllerRegistry.register(controller, priority);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
    return this;
  }

  public registerEndpoint(endpoint: HttpEndpoint, options?: HttpEndpointOptions): this {
    try {
      this._endpointRegistry.register(endpoint, options);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
    return this;
  }

  public async executeEndpoint<TReq = unknown, TResult = unknown>(
    endpoint: HttpEndpoint,
    context: HttpControllerContext<TReq>,
    options?: HttpControllerExecutionOptions,
  ): Promise<HttpControllerResult<TResult>> {
    const controller = this._controllerRegistry.get(endpoint.controllerId);
    if (!controller) {
      this._diagnostics.recordExecutionFailure(0);
      throw new HttpControllerExecutionError(
        `Controller '${endpoint.controllerId}' referenced by endpoint '${endpoint.id}' is not registered`,
        endpoint.controllerId,
      );
    }

    const timeoutMs = options?.timeoutMs ?? this._defaultTimeoutMs;
    return this._executor.execute<TReq, TResult>(controller, context, {
      ...options,
      timeoutMs,
    });
  }

  public async executeByRouteId<TReq = unknown, TResult = unknown>(
    routeId: string,
    context: HttpControllerContext<TReq>,
    options?: HttpControllerExecutionOptions,
  ): Promise<HttpControllerResult<TResult>> {
    const endpoint = this._endpointResolver.resolveByRouteId(routeId);
    if (!endpoint) {
      this._diagnostics.recordExecutionSkipped();
      throw new HttpEndpointNotFoundError(routeId);
    }

    return this.executeEndpoint<TReq, TResult>(endpoint, context, options);
  }

  public async executeById<TReq = unknown, TResult = unknown>(
    endpointId: string,
    context: HttpControllerContext<TReq>,
    options?: HttpControllerExecutionOptions,
  ): Promise<HttpControllerResult<TResult>> {
    const endpoint = this._endpointResolver.resolveById(endpointId);
    if (!endpoint || !endpoint.enabled) {
      this._diagnostics.recordExecutionSkipped();
      throw new HttpEndpointNotFoundError(endpointId);
    }

    return this.executeEndpoint<TReq, TResult>(endpoint, context, options);
  }

  public getDiagnostics(): HttpControllerDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
