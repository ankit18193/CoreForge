import {
  HttpMethod,
  HttpRequest,
  HttpRequestOptions,
  HttpResponse,
  HttpRoutingDiagnosticsSnapshot,
} from '@coreforge/contracts';

import { HttpPathMatcher } from './HttpPathMatcher';
import { HttpRouter } from './HttpRouter';
import { HttpControllerPipeline } from '../controller/HttpControllerPipeline';
import { HttpRoutingDiagnostics } from '../diagnostics/HttpRoutingDiagnostics';
import { HttpMethodNotAllowedError, HttpRouteNotFoundError } from '../errors/HttpRoutingErrors';
import { HttpExecutionCoordinator } from '../execution/HttpExecutionCoordinator';
import { HttpRoutingProfiler } from '../internal/HttpRoutingProfiler';
import { HttpLifecycleManager } from '../lifecycle/HttpLifecycleManager';
import { HttpMiddlewarePipeline } from '../middleware/HttpMiddlewarePipeline';
import { HttpRequestSnapshot } from '../request/HttpRequestSnapshot';
import { HttpRequestValidator } from '../request/HttpRequestValidator';
import { HttpResponseFactory } from '../response/HttpResponseFactory';
import { HTTP_STATUS_CODES, HttpErrorMappingOptions } from '../types/httpTypes';

export class HttpRoutingCoordinator {
  private readonly _lifecycle: HttpLifecycleManager;
  private readonly _diagnostics: HttpRoutingDiagnostics;
  private readonly _router: HttpRouter;
  private readonly _executionCoordinator: HttpExecutionCoordinator;
  private readonly _middlewarePipeline: HttpMiddlewarePipeline;
  private readonly _controllerPipeline: HttpControllerPipeline;
  private readonly _errorMappingOptions: HttpErrorMappingOptions;

  constructor(
    lifecycle: HttpLifecycleManager,
    diagnostics: HttpRoutingDiagnostics,
    router: HttpRouter,
    executionCoordinator: HttpExecutionCoordinator,
    errorMappingOptions: HttpErrorMappingOptions = {},
    middlewarePipeline?: HttpMiddlewarePipeline,
    controllerPipeline?: HttpControllerPipeline,
  ) {
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._router = router;
    this._executionCoordinator = executionCoordinator;
    this._errorMappingOptions = errorMappingOptions;
    this._middlewarePipeline =
      middlewarePipeline ??
      new HttpMiddlewarePipeline(router.middlewareCoordinator, errorMappingOptions);
    this._controllerPipeline =
      controllerPipeline ??
      new HttpControllerPipeline(
        router.controllerCoordinator,
        executionCoordinator,
        errorMappingOptions,
      );
  }

  public get router(): HttpRouter {
    return this._router;
  }

  public get executionCoordinator(): HttpExecutionCoordinator {
    return this._executionCoordinator;
  }

  public get diagnostics(): HttpRoutingDiagnostics {
    return this._diagnostics;
  }

  public get middlewarePipeline(): HttpMiddlewarePipeline {
    return this._middlewarePipeline;
  }

  public get controllerPipeline(): HttpControllerPipeline {
    return this._controllerPipeline;
  }

  public getDiagnostics(): HttpRoutingDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }

  public async execute<TReq = unknown, TRes = unknown>(
    request: HttpRequest<TReq>,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<TRes>> {
    // 1. Ensure Lifecycle State
    this._lifecycle.ensureReadyForExecution();

    const profiler = new HttpRoutingProfiler().start();
    this._diagnostics.recordResolutionStarted();

    // 2. Validate Request Structure
    let validatedRequest: HttpRequest<TReq>;
    try {
      validatedRequest = HttpRequestValidator.validate<TReq>(request);
    } catch (valErr: unknown) {
      const durationMs = profiler.stop();
      this._diagnostics.recordResolutionFailure(durationMs);
      return HttpResponseFactory.createFailure<TRes>(
        HTTP_STATUS_CODES.BAD_REQUEST,
        valErr,
        {},
        undefined,
        undefined,
        this._errorMappingOptions,
      );
    }

    const snapshot = HttpRequestSnapshot.create<TReq>(validatedRequest);
    const normalizedPath = HttpPathMatcher.normalizePath(snapshot.path);

    // 3. Resolve Route Match
    const match = this._router.resolve(snapshot.method as HttpMethod, normalizedPath);

    if (!match) {
      const durationMs = profiler.stop();

      // Check if path matches any other HTTP method for 405 Method Not Allowed
      const allowedMethods = this._router.findAllowedMethodsForPath(normalizedPath);

      if (allowedMethods.length > 0) {
        this._diagnostics.recordMethodNotAllowed(durationMs);
        const error = new HttpMethodNotAllowedError(snapshot.method, snapshot.path, allowedMethods);
        return HttpResponseFactory.createFailure<TRes>(
          HTTP_STATUS_CODES.METHOD_NOT_ALLOWED,
          error,
          { allow: allowedMethods.join(', ') },
          undefined,
          undefined,
          this._errorMappingOptions,
        );
      }

      // 404 Route Not Found
      this._diagnostics.recordRouteNotFound(durationMs);
      const notFoundErr = new HttpRouteNotFoundError(snapshot.method, snapshot.path);
      return HttpResponseFactory.createFailure<TRes>(
        HTTP_STATUS_CODES.NOT_FOUND,
        notFoundErr,
        {},
        undefined,
        undefined,
        this._errorMappingOptions,
      );
    }

    const durationMs = profiler.stop();
    this._diagnostics.recordResolutionSuccess(durationMs);

    // 4. Delegate to canonical HTTP Middleware Pipeline -> Controller Pipeline -> Execution Coordinator
    return this._middlewarePipeline.execute<TReq, TRes>(
      snapshot,
      match,
      (routedRequest) =>
        this._controllerPipeline.execute<unknown, TRes>(routedRequest, match, options),
      options,
    );
  }
}
