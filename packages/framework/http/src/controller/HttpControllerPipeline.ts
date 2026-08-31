import type {
  ExecutionContext,
  HttpRequest,
  HttpResponse,
  HttpRouteMatch,
} from '@coreforge/contracts';

import { HttpControllerCoordinator } from './HttpControllerCoordinator';
import { HttpControllerSnapshot } from './HttpControllerSnapshot';
import { HttpContextFactory } from '../context/HttpContextFactory';
import { HttpExecutionCoordinator } from '../execution/HttpExecutionCoordinator';
import { HttpResponseFactory } from '../response/HttpResponseFactory';
import {
  HTTP_STATUS_CODES,
  HttpErrorMappingOptions,
  HttpExecutionOptions,
} from '../types/httpTypes';

export class HttpControllerPipeline {
  private readonly _coordinator: HttpControllerCoordinator;
  private readonly _executionCoordinator: HttpExecutionCoordinator;
  private readonly _errorMappingOptions: HttpErrorMappingOptions;

  constructor(
    coordinator?: HttpControllerCoordinator,
    executionCoordinator?: HttpExecutionCoordinator,
    errorMappingOptions: HttpErrorMappingOptions = {},
  ) {
    this._coordinator = coordinator ?? new HttpControllerCoordinator();
    this._executionCoordinator = executionCoordinator as HttpExecutionCoordinator;
    this._errorMappingOptions = errorMappingOptions;
  }

  public get coordinator(): HttpControllerCoordinator {
    return this._coordinator;
  }

  public get executionCoordinator(): HttpExecutionCoordinator {
    return this._executionCoordinator;
  }

  public async execute<TReq = unknown, TRes = unknown>(
    request: HttpRequest<TReq>,
    match: HttpRouteMatch,
    options?: HttpExecutionOptions,
  ): Promise<HttpResponse<TRes>> {
    // 1. Build Context
    const transportCtx = HttpContextFactory.create(request, {
      executionContext: options?.context,
      extraMetadata: options?.metadata,
    });
    const execContext = transportCtx.executionContext;

    // 2. Resolve Endpoint for this Route
    const endpoint = this._coordinator.endpointResolver.resolveByRouteId(match.routeId);

    // 3. If Endpoint is bound to a Controller, execute through Controller
    if (endpoint && endpoint.enabled) {
      const controllerContext = HttpControllerSnapshot.createContext<TReq>({
        request,
        route: {
          id: match.routeId,
          method: match.method,
          path: match.path,
          operation: match.operation,
          metadata: match.metadata,
        },
        parameters: match.parameters,
        metadata: request.metadata ?? {},
        transportContext: transportCtx,
        executionContext: execContext as unknown as ExecutionContext,
      });

      const outcome = await this._coordinator.executeEndpoint<TReq, unknown>(
        endpoint,
        controllerContext,
        options ? { timeoutMs: options.timeoutMs, signal: options.context?.signal } : undefined,
      );

      if (!outcome.success) {
        if (outcome.state === 'CANCELLED') {
          const cancelStatus =
            this._errorMappingOptions.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;
          return HttpResponseFactory.createFailure<TRes>(
            cancelStatus,
            new Error('Controller execution was cancelled'),
            {},
            undefined,
            undefined,
            this._errorMappingOptions,
          );
        }

        return HttpResponseFactory.createFailure<TRes>(
          HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
          new Error(`Controller execution failed for endpoint '${endpoint.id}'`),
          {},
          undefined,
          undefined,
          this._errorMappingOptions,
        );
      }

      // Check if controller returned an HttpResponse directly
      const val = outcome.value;
      if (
        val &&
        typeof val === 'object' &&
        'status' in val &&
        typeof (val as { status: unknown }).status === 'number' &&
        'headers' in val
      ) {
        return val as HttpResponse<TRes>;
      }

      // If controller constructed an application payload or if we have an execution coordinator
      if (this._executionCoordinator) {
        const routedPayload = {
          serviceName: endpoint.operation || match.operation,
          input: val ?? {
            parameters: match.parameters,
            query: request.query ?? {},
            headers: request.headers,
            body: request.body,
          },
        };

        const routedRequest: HttpRequest = {
          method: request.method,
          url: request.url,
          path: request.path,
          headers: request.headers,
          query: request.query,
          pathParameters: match.parameters,
          cookies: request.cookies,
          body: routedPayload,
          metadata: {
            ...(request.metadata || {}),
            routeId: match.routeId,
            operation: endpoint.operation || match.operation,
            endpointId: endpoint.id,
            controllerId: endpoint.controllerId,
            routeMetadata: match.metadata,
          },
          signal: request.signal,
        };

        return this._executionCoordinator.execute<unknown, TRes>(routedRequest, options);
      }

      return HttpResponseFactory.createSuccess<TRes>(HTTP_STATUS_CODES.OK, val as TRes);
    }

    // 4. Default execution path without dedicated controller
    if (this._executionCoordinator) {
      const routedPayload = {
        serviceName: match.operation,
        input: {
          parameters: match.parameters,
          query: request.query ?? {},
          headers: request.headers,
          body: request.body,
        },
      };

      const routedRequest: HttpRequest = {
        method: request.method,
        url: request.url,
        path: request.path,
        headers: request.headers,
        query: request.query,
        pathParameters: match.parameters,
        cookies: request.cookies,
        body: routedPayload,
        metadata: {
          ...(request.metadata || {}),
          routeId: match.routeId,
          operation: match.operation,
          routeMetadata: match.metadata,
        },
        signal: request.signal,
      };

      return this._executionCoordinator.execute<unknown, TRes>(routedRequest, options);
    }

    return HttpResponseFactory.createSuccess<TRes>(
      HTTP_STATUS_CODES.OK,
      undefined as unknown as TRes,
    );
  }
}
