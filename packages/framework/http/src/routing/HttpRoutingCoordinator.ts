import {
  HttpMethod,
  HttpRequest,
  HttpRequestOptions,
  HttpResponse,
  HttpRoutingDiagnosticsSnapshot,
} from '@coreforge/contracts';

import { HttpPathMatcher } from './HttpPathMatcher';
import { HttpRouter } from './HttpRouter';
import { HttpRoutingDiagnostics } from '../diagnostics/HttpRoutingDiagnostics';
import { HttpMethodNotAllowedError, HttpRouteNotFoundError } from '../errors/HttpRoutingErrors';
import { HttpExecutionCoordinator } from '../execution/HttpExecutionCoordinator';
import { HttpRoutingProfiler } from '../internal/HttpRoutingProfiler';
import { HttpLifecycleManager } from '../lifecycle/HttpLifecycleManager';
import { HttpRequestSnapshot } from '../request/HttpRequestSnapshot';
import { HttpRequestValidator } from '../request/HttpRequestValidator';
import { HttpResponseFactory } from '../response/HttpResponseFactory';
import { HTTP_STATUS_CODES, HttpErrorMappingOptions } from '../types/httpTypes';

export class HttpRoutingCoordinator {
  private readonly _lifecycle: HttpLifecycleManager;
  private readonly _diagnostics: HttpRoutingDiagnostics;
  private readonly _router: HttpRouter;
  private readonly _executionCoordinator: HttpExecutionCoordinator;
  private readonly _errorMappingOptions: HttpErrorMappingOptions;

  constructor(
    lifecycle: HttpLifecycleManager,
    diagnostics: HttpRoutingDiagnostics,
    router: HttpRouter,
    executionCoordinator: HttpExecutionCoordinator,
    errorMappingOptions: HttpErrorMappingOptions = {},
  ) {
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._router = router;
    this._executionCoordinator = executionCoordinator;
    this._errorMappingOptions = errorMappingOptions;
  }

  public get router(): HttpRouter {
    return this._router;
  }

  public get diagnostics(): HttpRoutingDiagnostics {
    return this._diagnostics;
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

    // 4. Construct Immutable Routed Execution Input (Zero body mutation)
    // Wrap operation payload for Transport / ApplicationIntegration
    const routedPayload = {
      serviceName: match.operation,
      input: {
        parameters: match.parameters,
        query: snapshot.query ?? {},
        headers: snapshot.headers,
        body: snapshot.body,
      },
    };

    const routedRequest: HttpRequest = {
      method: snapshot.method,
      url: snapshot.url,
      path: snapshot.path,
      headers: snapshot.headers,
      query: snapshot.query,
      pathParameters: match.parameters,
      cookies: snapshot.cookies,
      body: routedPayload,
      metadata: {
        ...(snapshot.metadata || {}),
        routeId: match.routeId,
        operation: match.operation,
        routeMetadata: match.metadata,
      },
      signal: snapshot.signal,
    };

    // 5. Delegate to canonical HTTP Execution Coordinator
    return this._executionCoordinator.execute<unknown, TRes>(routedRequest, options);
  }
}
