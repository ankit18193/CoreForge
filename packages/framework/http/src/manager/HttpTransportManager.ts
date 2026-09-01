import {
  HttpBindingDiagnosticsSnapshot,
  HttpControllerDiagnosticsSnapshot,
  HttpDiagnosticsSnapshot,
  HttpMiddleware,
  HttpMiddlewareDiagnosticsSnapshot,
  HttpMiddlewareOptions,
  HttpRequest,
  HttpResponse,
  HttpResponseDiagnosticsSnapshot,
  HttpRoutingDiagnosticsSnapshot,
  TransportManager as ITransportManager,
} from '@coreforge/contracts';
import { TransportBuilder, TransportManager } from '@coreforge/transport';

import { HttpTransportAdapter } from '../adapter/HttpTransportAdapter';
import { HttpDiagnostics } from '../diagnostics/HttpDiagnostics';
import { HttpRoutingDiagnostics } from '../diagnostics/HttpRoutingDiagnostics';
import { HttpExecutionCoordinator } from '../execution/HttpExecutionCoordinator';
import { HttpLifecycleManager } from '../lifecycle/HttpLifecycleManager';
import { HttpState } from '../lifecycle/HttpState';
import { HttpSerializationEngine } from '../response/HttpSerializationEngine';
import { HttpRouter } from '../routing/HttpRouter';
import { HttpRoutingCoordinator } from '../routing/HttpRoutingCoordinator';
import {
  HttpErrorMappingOptions,
  HttpExecutionOptions,
  HttpTransportOptions,
} from '../types/httpTypes';

export class HttpTransportManager {
  private readonly _lifecycle: HttpLifecycleManager;
  private readonly _diagnostics: HttpDiagnostics;
  private readonly _routingDiagnostics: HttpRoutingDiagnostics;
  private readonly _transportManager: ITransportManager;
  private readonly _adapter: HttpTransportAdapter;
  private readonly _coordinator: HttpExecutionCoordinator;
  private readonly _router?: HttpRouter | undefined;
  private readonly _routingCoordinator?: HttpRoutingCoordinator | undefined;
  private readonly _errorMappingOptions: HttpErrorMappingOptions;

  constructor(options: HttpTransportOptions = {}) {
    this._lifecycle = new HttpLifecycleManager();
    this._diagnostics = new HttpDiagnostics();
    this._routingDiagnostics = new HttpRoutingDiagnostics();
    this._errorMappingOptions = options.errorMappingOptions ?? {};

    this._adapter = new HttpTransportAdapter();

    if (options.transportManager) {
      this._transportManager = options.transportManager;
      // If transportManager is not yet started, register adapter
      if (this._transportManager.state === 'CREATED') {
        this._transportManager.registerAdapter(this._adapter);
      }
    } else {
      let builder = TransportBuilder.create();
      if (options.application) {
        builder = builder.withApplication(options.application);
      }
      if (options.defaultTimeoutMs) {
        builder = builder.withDefaultTimeout(options.defaultTimeoutMs);
      }
      builder = builder.registerAdapter(this._adapter);
      this._transportManager = builder.build();
    }

    this._coordinator = new HttpExecutionCoordinator(
      this._lifecycle,
      this._diagnostics,
      this._transportManager,
      options.defaultTimeoutMs ?? 30000,
      this._errorMappingOptions,
      options.serializationEngine as HttpSerializationEngine | undefined,
    );

    if (options.router instanceof HttpRouter) {
      this._router = options.router;
      this._routingCoordinator = new HttpRoutingCoordinator(
        this._lifecycle,
        this._routingDiagnostics,
        this._router,
        this._coordinator,
        this._errorMappingOptions,
      );
    }

    if (options.autoStart) {
      this.startSync();
    }
  }

  public get state(): HttpState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get transportManager(): ITransportManager {
    return this._transportManager;
  }

  public get adapter(): HttpTransportAdapter {
    return this._adapter;
  }

  public get router(): HttpRouter | undefined {
    return this._router;
  }

  public get routingCoordinator(): HttpRoutingCoordinator | undefined {
    return this._routingCoordinator;
  }

  public use<TContext = unknown, TResult = unknown>(
    middleware: HttpMiddleware<TContext, TResult>,
    options?: HttpMiddlewareOptions,
  ): this {
    if (this._router) {
      this._router.use(middleware, options);
    }
    return this;
  }

  public startSync(): void {
    if (this._transportManager.state === 'CREATED') {
      (this._transportManager as TransportManager).startSync?.();
    }
    this._lifecycle.start();
  }

  public async start(): Promise<void> {
    if (this._transportManager.state === 'CREATED') {
      await this._transportManager.start();
    }
    this._lifecycle.start();
  }

  public async stop(timeoutMs = 5000): Promise<void> {
    await this._lifecycle.stop(timeoutMs);
    if (this._transportManager.state === 'READY') {
      await this._transportManager.stop();
    }
  }

  public async execute<TReq = unknown, TRes = unknown>(
    request: HttpRequest<TReq> | unknown,
    options?: HttpExecutionOptions,
  ): Promise<HttpResponse<TRes>> {
    return this._coordinator.execute<TReq, TRes>(request, options);
  }

  public async handleRoutedRequest<TReq = unknown, TRes = unknown>(
    request: HttpRequest<TReq>,
    options?: HttpExecutionOptions,
  ): Promise<HttpResponse<TRes>> {
    if (!this._routingCoordinator) {
      return this._coordinator.execute<TReq, TRes>(request, options);
    }
    return this._routingCoordinator.execute<TReq, TRes>(request, options);
  }

  public getDiagnostics(): HttpDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public getRoutingDiagnostics(): HttpRoutingDiagnosticsSnapshot {
    return this._routingDiagnostics.getSnapshot();
  }

  public getMiddlewareDiagnostics(): HttpMiddlewareDiagnosticsSnapshot | undefined {
    return this._routingCoordinator?.middlewarePipeline.diagnostics;
  }

  public getControllerDiagnostics(): HttpControllerDiagnosticsSnapshot | undefined {
    return this._routingCoordinator?.controllerPipeline.coordinator.getDiagnostics();
  }

  public getBindingDiagnostics(): HttpBindingDiagnosticsSnapshot | undefined {
    return this._routingCoordinator?.controllerPipeline.coordinator.bindingCoordinator.getDiagnostics();
  }

  public getSerializationDiagnostics(): HttpResponseDiagnosticsSnapshot {
    return this._coordinator.serializationEngine.diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
    this._routingDiagnostics.reset();
    this._coordinator.serializationEngine.diagnostics.reset();
    this._routingCoordinator?.middlewarePipeline.resetDiagnostics();
    this._routingCoordinator?.controllerPipeline.coordinator.resetDiagnostics();
    this._routingCoordinator?.controllerPipeline.coordinator.bindingCoordinator.resetDiagnostics();
  }
}
