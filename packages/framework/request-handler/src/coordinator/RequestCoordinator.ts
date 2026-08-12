import { HttpRequest, HttpResponse } from '@coreforge/contracts';

import { ControllerCoordinator } from './ControllerCoordinator';
import { MiddlewareCoordinator } from './MiddlewareCoordinator';
import { ResponseCoordinator } from './ResponseCoordinator';
import { ResponseMapper } from './ResponseMapper';
import { RoutingCoordinator } from './RoutingCoordinator';
import { NotFoundHandler } from '../fallback/NotFoundHandler';
import { RequestHandlerConfiguration } from '../handler/RequestHandlerConfiguration';
import { RequestProfiler } from '../internal/RequestProfiler';
import { RequestLifecycleManager } from '../lifecycle/RequestLifecycleManager';
import { RequestCancellation } from '../pipeline/RequestCancellation';
import { RequestExecutionContext } from '../pipeline/RequestExecutionContext';
import { RequestPipeline } from '../pipeline/RequestPipeline';
import { RequestState } from '../pipeline/RequestState';
import { RequestServices } from '../types/requestHandlerTypes';

export class RequestCoordinator {
  private readonly _config: RequestHandlerConfiguration;
  private readonly _pipeline: RequestPipeline;
  private readonly _profiler: RequestProfiler;

  private readonly _responseMapper: ResponseMapper;
  private readonly _responseCoordinator = new ResponseCoordinator();
  private readonly _notFoundHandler = new NotFoundHandler();

  constructor(config: RequestHandlerConfiguration, profiler: RequestProfiler) {
    this._config = config;
    this._profiler = profiler;

    const stages = [
      new RoutingCoordinator(config.router),
      new MiddlewareCoordinator(config.middlewarePipeline),
      new ControllerCoordinator(config.controllerManager),
    ];
    this._pipeline = new RequestPipeline(stages, profiler);
    this._responseMapper = new ResponseMapper(config.exceptionMapper);
  }

  public async execute(
    request: HttpRequest,
    response: HttpResponse,
    services: RequestServices,
    requestId: string,
  ): Promise<void> {
    this._profiler.startRequest();

    const cancellation = new RequestCancellation();
    const context = new RequestExecutionContext({
      request,
      response,
      services,
      requestId,
      cancellation,
    });

    const lifecycle = new RequestLifecycleManager();
    const start = Date.now();

    try {
      const mapping = this._config.routeMappings.find(
        (m) => m.method === request.method && m.path === request.path,
      );
      if (mapping) {
        context.diagnostics.routeMapping = mapping;
      }

      await this._pipeline.execute(context, lifecycle);

      if (!context.route && !context.diagnostics.middlewareTerminatedEarly) {
        const result = this._notFoundHandler.handle(context);
        lifecycle.transitionTo(RequestState.RESPONDING);
        this._responseCoordinator.dispatch(result, response);
        lifecycle.transitionTo(RequestState.COMPLETED);
        this._profiler.completeRequest(Date.now() - start);
        return;
      }

      lifecycle.transitionTo(RequestState.RESPONDING);

      const result = this._responseMapper.map(context);
      this._responseCoordinator.dispatch(result, response);

      lifecycle.transitionTo(RequestState.COMPLETED);
      this._profiler.completeRequest(Date.now() - start);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('CancellationException')) {
        this._profiler.cancelRequest();
      } else {
        this._profiler.failRequest();
      }

      lifecycle.transitionTo(RequestState.RESPONDING);

      const ctrlResult = { success: false, returnedValue: null, duration: 0, exception: err };
      context.diagnostics.controllerResult = ctrlResult;

      const errorResult = this._responseMapper.map(context);
      this._responseCoordinator.dispatch(errorResult, response);

      if (lifecycle.state === RequestState.RESPONDING) {
        lifecycle.transitionTo(RequestState.COMPLETED);
      }

      this._profiler.completeRequest(Date.now() - start);
    }
  }
}
