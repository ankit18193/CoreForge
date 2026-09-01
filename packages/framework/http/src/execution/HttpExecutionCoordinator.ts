import {
  HttpRequest,
  HttpResponse,
  TransportManager,
  TransportResponse,
} from '@coreforge/contracts';
import { TransportResponseFactory } from '@coreforge/transport';

import { HttpContextFactory } from '../context/HttpContextFactory';
import { HttpDiagnostics } from '../diagnostics/HttpDiagnostics';
import { HttpCancellationError, HttpError } from '../errors/HttpErrors';
import { HttpProfiler } from '../internal/HttpProfiler';
import { HttpLifecycleManager } from '../lifecycle/HttpLifecycleManager';
import { HttpRequestMapper } from '../request/HttpRequestMapper';
import { HttpRequestSnapshot } from '../request/HttpRequestSnapshot';
import { DefaultHttpErrorMapper } from '../response/error/DefaultHttpErrorMapper';
import { HttpErrorMappingEngine } from '../response/error/HttpErrorMappingEngine';
import { HttpPublicErrorSnapshot } from '../response/error/HttpPublicErrorSnapshot';
import { HttpResponseFactory } from '../response/HttpResponseFactory';
import { HttpResponseMapper } from '../response/HttpResponseMapper';
import { HttpSerializationEngine } from '../response/HttpSerializationEngine';
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
  private readonly _serializationEngine?: HttpSerializationEngine | undefined;
  private readonly _errorMappingEngine?: HttpErrorMappingEngine | undefined;

  constructor(
    lifecycle: HttpLifecycleManager,
    diagnostics: HttpDiagnostics,
    transportManager: TransportManager,
    defaultTimeoutMs = 30000,
    errorMappingOptions: HttpErrorMappingOptions = {},
    serializationEngine?: HttpSerializationEngine,
    errorMappingEngine?: HttpErrorMappingEngine,
  ) {
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._transportManager = transportManager;
    this._defaultTimeoutMs = defaultTimeoutMs;
    this._errorMappingOptions = errorMappingOptions;
    this._serializationEngine = serializationEngine;
    this._errorMappingEngine = errorMappingEngine;
  }

  public get serializationEngine(): HttpSerializationEngine | undefined {
    return this._serializationEngine;
  }

  public get errorMappingEngine(): HttpErrorMappingEngine | undefined {
    return this._errorMappingEngine;
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
        this._errorMappingEngine,
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

      const context = HttpPublicErrorSnapshot.createContext({
        requestId:
          typeof (rawRequest as { id?: string })?.id === 'string'
            ? (rawRequest as { id: string }).id
            : undefined,
        method:
          typeof (rawRequest as { method?: string })?.method === 'string'
            ? (rawRequest as { method: string }).method
            : undefined,
        url:
          typeof (rawRequest as { url?: string })?.url === 'string'
            ? (rawRequest as { url: string }).url
            : undefined,
        path:
          typeof (rawRequest as { path?: string })?.path === 'string'
            ? (rawRequest as { path: string }).path
            : undefined,
        metadata: options?.metadata,
      });

      const mappingResult = this._errorMappingEngine
        ? await this._errorMappingEngine.mapError(err, context)
        : new DefaultHttpErrorMapper(this._errorMappingOptions).map(err, context);

      const errorPayload = { error: mappingResult.publicError };
      const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
        (mappingResult.headers ?? {}) as Record<string, string | readonly string[]>,
      );

      if (this._serializationEngine) {
        const requestedMediaType = options?.mediaType ?? 'application/json';
        const serResult = await this._serializationEngine.serialize(errorPayload, {
          status: mappingResult.status,
          mediaType: requestedMediaType,
          charset: options?.charset,
          serializerId: options?.serializerId,
          transformationOptions: {
            fieldsToRedact: options?.fieldsToRedact,
            circularPolicy: options?.circularPolicy,
          },
          timeoutMs: options?.timeoutMs,
          signal: options?.signal,
          throwOnError: false,
        });

        if (serResult.success) {
          if (!normalizedHeaders['content-type']) {
            normalizedHeaders['content-type'] = serResult.mediaType ?? requestedMediaType;
          }
          return HttpResponseFactory.createSuccess<TRes>(
            mappingResult.status,
            serResult.value as TRes,
            normalizedHeaders,
            undefined,
            options?.metadata,
          );
        }
      }

      return HttpResponseFactory.createFailure<TRes>(
        mappingResult.status,
        err,
        normalizedHeaders,
        undefined,
        undefined,
        this._errorMappingOptions,
      );
    } finally {
      this._lifecycle.releaseRequest();
    }
  }
}
