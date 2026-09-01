import {
  HttpRequest,
  HttpResponse,
  TransportManager,
  TransportResponse,
} from '@coreforge/contracts';
import { TransportResponseFactory } from '@coreforge/transport';

import { HttpContextFactory } from '../context/HttpContextFactory';
import { HttpDiagnostics } from '../diagnostics/HttpDiagnostics';
import {
  HttpCancellationError,
  HttpError,
  HttpTimeoutError,
  HttpValidationError,
} from '../errors/HttpErrors';
import { HttpProfiler } from '../internal/HttpProfiler';
import { HttpLifecycleManager } from '../lifecycle/HttpLifecycleManager';
import { HttpRequestMapper } from '../request/HttpRequestMapper';
import { HttpRequestSnapshot } from '../request/HttpRequestSnapshot';
import { HttpResponseFactory } from '../response/HttpResponseFactory';
import { HttpResponseMapper } from '../response/HttpResponseMapper';
import { HttpSerializationEngine } from '../response/HttpSerializationEngine';
import { HttpSerializerRegistry } from '../response/HttpSerializerRegistry';
import { HttpSerializerResolver } from '../response/HttpSerializerResolver';
import { HttpJsonSerializer } from '../response/serializers/HttpJsonSerializer';
import {
  HTTP_STATUS_CODES,
  HttpErrorMappingOptions,
  HttpExecutionOptions,
} from '../types/httpTypes';

export class HttpExecutionCoordinator {
  private readonly _lifecycle: HttpLifecycleManager;
  private readonly _diagnostics: HttpDiagnostics;
  private readonly _transportManager: TransportManager;
  private readonly _defaultTimeoutMs: number;
  private readonly _errorMappingOptions: HttpErrorMappingOptions;
  private readonly _serializationEngine: HttpSerializationEngine;

  constructor(
    lifecycle: HttpLifecycleManager,
    diagnostics: HttpDiagnostics,
    transportManager: TransportManager,
    defaultTimeoutMs = 30000,
    errorMappingOptions: HttpErrorMappingOptions = {},
    serializationEngine?: HttpSerializationEngine,
  ) {
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._transportManager = transportManager;
    this._defaultTimeoutMs = defaultTimeoutMs;
    this._errorMappingOptions = errorMappingOptions;
    if (serializationEngine) {
      this._serializationEngine = serializationEngine;
    } else {
      const reg = new HttpSerializerRegistry();
      reg.register(new HttpJsonSerializer());
      this._serializationEngine = new HttpSerializationEngine(new HttpSerializerResolver(reg));
    }
  }

  public get serializationEngine(): HttpSerializationEngine {
    return this._serializationEngine;
  }

  public async execute<TReq = unknown, TRes = unknown>(
    rawRequest: HttpRequest<TReq> | unknown,
    options?: HttpExecutionOptions,
  ): Promise<HttpResponse<TRes>> {
    this._lifecycle.acquireRequest();
    const profiler = new HttpProfiler().start();
    this._diagnostics.recordRequestStarted();

    try {
      // 1. Validate & Snapshot HTTP Request
      let snapshot: HttpRequest<TReq>;
      try {
        snapshot = HttpRequestSnapshot.create<TReq>(rawRequest);
      } catch (validationErr: unknown) {
        this._diagnostics.recordValidationFailure();
        throw validationErr;
      }

      // 2. Create HTTP & Transport Context
      const context = HttpContextFactory.create(snapshot, {
        executionContext: options?.context,
        extraMetadata: options?.metadata,
      });

      // 3. Early Cancellation Check
      if (context.executionContext.signal.aborted) {
        const durationMs = profiler.stop();
        const cancelErr = new HttpCancellationError('HTTP request was cancelled before execution');
        this._diagnostics.recordRequestFailure(durationMs, true);
        this._diagnostics.recordResponseMapping();

        const cancelStatus =
          this._errorMappingOptions.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;

        return HttpResponseFactory.createFailure<TRes>(
          cancelStatus,
          cancelErr,
          {},
          undefined,
          undefined,
          this._errorMappingOptions,
        );
      }

      // 4. Map to TransportRequest
      let transportRequest;
      try {
        transportRequest = HttpRequestMapper.toTransportRequest<TReq, unknown>(snapshot, {
          executionContext: context.executionContext,
          extraMetadata: options?.metadata,
        });
      } catch (mapErr: unknown) {
        this._diagnostics.recordMappingFailure();
        throw mapErr;
      }

      // 5. Execute exclusively via TransportManager
      const timeoutMs = options?.timeoutMs ?? this._defaultTimeoutMs;
      const transportResult = await this._transportManager.execute(transportRequest, {
        context: context.executionContext,
        timeoutMs,
      });

      // 6. Check In-flight Cancellation
      if (context.executionContext.signal.aborted) {
        const durationMs = profiler.stop();
        const cancelErr = new HttpCancellationError('HTTP request was cancelled during execution');
        this._diagnostics.recordRequestFailure(durationMs, true);
        this._diagnostics.recordResponseMapping();

        const cancelStatus =
          this._errorMappingOptions.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;

        return HttpResponseFactory.createFailure<TRes>(
          cancelStatus,
          cancelErr,
          {},
          undefined,
          undefined,
          this._errorMappingOptions,
        );
      }

      // 7. Map TransportResponse to HttpResponse
      const transportResponse =
        transportResult.response ??
        TransportResponseFactory.createFailure(
          transportResult.error ?? new HttpError('Transport execution failed without response'),
        );

      const httpResponse = await HttpResponseMapper.toHttpResponseAsync<TRes>(
        transportResponse as TransportResponse<TRes>,
        this._errorMappingOptions,
        options,
        this._serializationEngine,
      );

      const durationMs = profiler.stop();
      this._diagnostics.recordResponseMapping();

      if (httpResponse.status >= 400) {
        const isCancelled =
          httpResponse.status ===
          (this._errorMappingOptions.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST);
        this._diagnostics.recordRequestFailure(durationMs, isCancelled);
      } else {
        this._diagnostics.recordRequestSuccess(durationMs);
      }

      return httpResponse;
    } catch (err: unknown) {
      const durationMs = profiler.stop();
      const isCancelled =
        err instanceof HttpCancellationError ||
        (typeof err === 'object' &&
          err !== null &&
          (err as { name?: string }).name === 'AbortError');

      this._diagnostics.recordRequestFailure(durationMs, isCancelled);
      this._diagnostics.recordResponseMapping();

      let status: number = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
      if (err instanceof HttpValidationError) {
        status = HTTP_STATUS_CODES.BAD_REQUEST;
      } else if (err instanceof HttpTimeoutError) {
        status = HTTP_STATUS_CODES.GATEWAY_TIMEOUT;
      } else if (isCancelled) {
        status =
          this._errorMappingOptions.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;
      }

      return HttpResponseFactory.createFailure<TRes>(
        status,
        err,
        {},
        undefined,
        undefined,
        this._errorMappingOptions,
      );
    } finally {
      this._lifecycle.releaseRequest();
    }
  }
}
