import type {
  ExecutionContext,
  HttpMiddlewareDiagnosticsSnapshot,
  HttpMiddlewareRouteInfo,
  HttpRequest,
  HttpResponse,
  HttpRouteMatch,
} from '@coreforge/contracts';

import { HttpMiddlewareCoordinator } from './HttpMiddlewareCoordinator';
import { HttpMiddlewareSnapshot } from './HttpMiddlewareSnapshot';
import { HttpContextFactory } from '../context/HttpContextFactory';
import { HttpResponseFactory } from '../response/HttpResponseFactory';
import {
  HTTP_STATUS_CODES,
  HttpErrorMappingOptions,
  HttpExecutionOptions,
} from '../types/httpTypes';

export class HttpMiddlewarePipeline {
  private readonly _coordinator: HttpMiddlewareCoordinator;
  private readonly _errorMappingOptions: HttpErrorMappingOptions;

  constructor(
    coordinator?: HttpMiddlewareCoordinator,
    errorMappingOptions: HttpErrorMappingOptions = {},
  ) {
    this._coordinator = coordinator ?? new HttpMiddlewareCoordinator();
    this._errorMappingOptions = errorMappingOptions;
  }

  public get coordinator(): HttpMiddlewareCoordinator {
    return this._coordinator;
  }

  public get diagnostics(): HttpMiddlewareDiagnosticsSnapshot {
    return this._coordinator.getDiagnostics();
  }

  public resetDiagnostics(): void {
    this._coordinator.resetDiagnostics();
  }

  public async execute<TReq = unknown, TRes = unknown>(
    request: HttpRequest<TReq>,
    match: HttpRouteMatch | undefined,
    nextHandler: (routedReq: HttpRequest<unknown>) => Promise<HttpResponse<TRes>>,
    options?: HttpExecutionOptions,
  ): Promise<HttpResponse<TRes>> {
    // 1. Build HTTP / Execution Context
    const transportCtx = HttpContextFactory.create(request, {
      executionContext: options?.context,
      extraMetadata: options?.metadata,
    });
    const execContext = transportCtx.executionContext;

    // 2. Build Route Info if available
    let routeInfo: HttpMiddlewareRouteInfo | undefined;
    if (match) {
      routeInfo = {
        id: match.routeId,
        method: match.method,
        path: match.path,
        operation: match.operation,
        metadata: match.metadata,
      };
    }

    // 3. Build Immutable Middleware Context
    const middlewareContext = HttpMiddlewareSnapshot.createContext<TReq>({
      request,
      route: routeInfo,
      parameters: match?.parameters ?? {},
      transportContext: transportCtx,
      executionContext: execContext as unknown as ExecutionContext,
      metadata: request.metadata ?? {},
    });

    // 4. Execute via Coordinator
    try {
      const timeoutOptions =
        options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : undefined;

      const outcome = await this._coordinator.execute<TReq, unknown>(
        middlewareContext,
        async (ctx) => {
          // Terminal target: construct routed request and delegate to nextHandler
          if (match) {
            const routedPayload = {
              serviceName: match.operation,
              input: {
                parameters: match.parameters,
                query: ctx.request.query ?? {},
                headers: ctx.request.headers,
                body: ctx.request.body,
              },
            };

            const routedRequest: HttpRequest = {
              method: ctx.request.method,
              url: ctx.request.url,
              path: ctx.request.path,
              headers: ctx.request.headers,
              query: ctx.request.query,
              pathParameters: match.parameters,
              cookies: ctx.request.cookies,
              body: routedPayload,
              metadata: {
                ...(ctx.request.metadata || {}),
                routeId: match.routeId,
                operation: match.operation,
                routeMetadata: match.metadata,
              },
              signal: ctx.request.signal,
            };

            return nextHandler(routedRequest);
          }

          return nextHandler(ctx.request as HttpRequest<unknown>);
        },
        timeoutOptions,
      );

      // 5. Short-circuit / Response Adaptation
      if (!outcome.batch.success) {
        if (outcome.batch.cancelledMiddleware > 0) {
          const cancelStatus =
            this._errorMappingOptions.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;
          return HttpResponseFactory.createFailure<TRes>(
            cancelStatus,
            new Error('Middleware execution was cancelled'),
            {},
            undefined,
            undefined,
            this._errorMappingOptions,
          );
        }

        return HttpResponseFactory.createFailure<TRes>(
          HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
          new Error('Middleware execution failed'),
          {},
          undefined,
          undefined,
          this._errorMappingOptions,
        );
      }

      const res = outcome.result;
      if (
        res &&
        typeof res === 'object' &&
        'status' in res &&
        typeof (res as { status: unknown }).status === 'number' &&
        'headers' in res
      ) {
        return res as HttpResponse<TRes>;
      }

      return HttpResponseFactory.createSuccess<TRes>(HTTP_STATUS_CODES.OK, res as TRes);
    } catch (err: unknown) {
      return HttpResponseFactory.createFailure<TRes>(
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        err,
        {},
        undefined,
        undefined,
        this._errorMappingOptions,
      );
    }
  }
}
