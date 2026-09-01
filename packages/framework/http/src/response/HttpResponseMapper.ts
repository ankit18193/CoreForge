import { HttpResponse, TransportResponse } from '@coreforge/contracts';

import { DefaultHttpErrorMapper } from './error/DefaultHttpErrorMapper';
import { HttpErrorMappingEngine } from './error/HttpErrorMappingEngine';
import { HttpPublicErrorSnapshot } from './error/HttpPublicErrorSnapshot';
import { HttpErrorMapper } from './HttpErrorMapper';
import { HttpResponseFactory } from './HttpResponseFactory';
import { HttpSerializationEngine } from './HttpSerializationEngine';
import {
  HTTP_STATUS_CODES,
  HttpErrorMappingOptions,
  HttpExecutionOptions,
} from '../types/httpTypes';

export class HttpResponseMapper {
  /**
   * Deterministically resolve HTTP status code from transport response.
   * Order of precedence:
   * 1. Explicit status in response body (if already an HttpResponse or DTO with status)
   * 2. Explicit status in transport metadata
   * 3. Explicit isCreated flag in transport metadata -> 201 Created
   * 4. Explicit noContent flag in transport metadata -> 204 No Content
   * 5. Default success -> 200 OK
   */
  public static resolveStatus(
    transportResponse: TransportResponse,
    _options: HttpExecutionOptions = {},
  ): number {
    const rawBody = transportResponse.body as Record<string, unknown>;

    // 1. Explicit status in response body
    if (
      rawBody &&
      typeof rawBody === 'object' &&
      typeof rawBody.status === 'number' &&
      rawBody.status >= 100 &&
      rawBody.status <= 599
    ) {
      return rawBody.status;
    }

    // 2. Explicit status in transport metadata
    if (
      transportResponse.metadata &&
      typeof transportResponse.metadata.status === 'number' &&
      transportResponse.metadata.status >= 100 &&
      transportResponse.metadata.status <= 599
    ) {
      return transportResponse.metadata.status;
    }

    // 3. Explicit isCreated flag in transport metadata -> 201 Created
    if (transportResponse.metadata && Boolean(transportResponse.metadata.isCreated)) {
      return HTTP_STATUS_CODES.CREATED;
    }

    // 4. Explicit noContent flag in transport metadata -> 204 No Content
    if (transportResponse.metadata && Boolean(transportResponse.metadata.noContent)) {
      return HTTP_STATUS_CODES.NO_CONTENT;
    }

    // 5. Default success
    return HTTP_STATUS_CODES.OK;
  }

  /**
   * Normalize response headers by converting all keys to lowercase.
   */
  public static normalizeHeaders(
    headers?: Record<string, string | readonly string[]>,
  ): Record<string, string | readonly string[]> {
    const normalized: Record<string, string | readonly string[]> = {};
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        normalized[k.toLowerCase()] = v;
      }
    }
    return normalized;
  }

  /**
   * Synchronous mapping for fallback or non-streaming paths.
   */
  public static toHttpResponse<TBody = unknown>(
    transportResponse: TransportResponse<TBody>,
    errorOptions: HttpErrorMappingOptions = {},
    execOptions: HttpExecutionOptions = {},
    errorEngine?: HttpErrorMappingEngine,
  ): HttpResponse<TBody> {
    if (transportResponse.success) {
      const rawBody = transportResponse.body as Record<string, unknown>;

      // If the body is already an HttpResponse object
      if (
        rawBody &&
        typeof rawBody === 'object' &&
        typeof rawBody.status === 'number' &&
        'headers' in rawBody
      ) {
        const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
          rawBody.headers as Record<string, string | readonly string[]>,
        );
        return HttpResponseFactory.createSuccess<TBody>(
          rawBody.status as number,
          rawBody.body as TBody,
          normalizedHeaders,
          rawBody.cookies as Record<string, string>,
          {
            ...(transportResponse.metadata || {}),
            ...((rawBody.metadata as Record<string, unknown>) || {}),
          },
        );
      }

      const status = HttpResponseMapper.resolveStatus(transportResponse, execOptions);
      const is204 = status === HTTP_STATUS_CODES.NO_CONTENT;

      const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
        execOptions.metadata?.headers as Record<string, string | readonly string[]>,
      );
      if (!is204 && !normalizedHeaders['content-type']) {
        normalizedHeaders['content-type'] = execOptions.mediaType ?? 'application/json';
      }

      return HttpResponseFactory.createSuccess<TBody>(
        status,
        is204 ? undefined : transportResponse.body,
        normalizedHeaders,
        undefined,
        transportResponse.metadata,
      );
    }

    const context = HttpPublicErrorSnapshot.createContext({
      metadata: transportResponse.metadata,
    });

    const mappingResult = errorEngine
      ? errorEngine.mapErrorSync(transportResponse.error, context)
      : new DefaultHttpErrorMapper(errorOptions).map(transportResponse.error, context);

    const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
      (mappingResult.headers ?? {}) as Record<string, string | readonly string[]>,
    );

    return HttpResponseFactory.createFailure<TBody>(
      mappingResult.status,
      transportResponse.error,
      normalizedHeaders,
      undefined,
      transportResponse.metadata,
      errorOptions,
    );
  }

  /**
   * Asynchronous response transformation & serialization pipeline:
   * TransportResponse -> Status Resolution -> Transformation -> Serializer Resolution -> Serialization -> HttpResponse
   */
  public static async toHttpResponseAsync<TBody = unknown>(
    transportResponse: TransportResponse<TBody>,
    errorOptions: HttpErrorMappingOptions = {},
    execOptions: HttpExecutionOptions = {},
    engine?: HttpSerializationEngine,
    errorEngine?: HttpErrorMappingEngine,
  ): Promise<HttpResponse<TBody>> {
    if (!transportResponse.success) {
      const context = HttpPublicErrorSnapshot.createContext({
        metadata: transportResponse.metadata,
      });

      const mappingResult = errorEngine
        ? await errorEngine.mapError(transportResponse.error, context)
        : new DefaultHttpErrorMapper(errorOptions).map(transportResponse.error, context);

      const errorPayload = { error: mappingResult.publicError };
      const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
        (mappingResult.headers ?? {}) as Record<string, string | readonly string[]>,
      );

      // Phase 8.8: Error responses reuse Phase 8.7 serialization engine if provided
      if (engine) {
        const requestedMediaType = execOptions.mediaType ?? 'application/json';
        const serResult = await engine.serialize(errorPayload, {
          status: mappingResult.status,
          mediaType: requestedMediaType,
          charset: execOptions.charset,
          serializerId: execOptions.serializerId,
          transformationOptions: {
            fieldsToRedact: execOptions.fieldsToRedact,
            circularPolicy: execOptions.circularPolicy,
          },
          timeoutMs: execOptions.timeoutMs,
          signal: execOptions.signal,
          throwOnError: false,
        });

        if (serResult.success) {
          if (!normalizedHeaders['content-type']) {
            normalizedHeaders['content-type'] = serResult.mediaType ?? requestedMediaType;
          }

          return HttpResponseFactory.createSuccess<TBody>(
            mappingResult.status,
            serResult.value as TBody,
            normalizedHeaders,
            undefined,
            transportResponse.metadata,
          );
        }
      }

      return HttpResponseFactory.createFailure<TBody>(
        mappingResult.status,
        transportResponse.error,
        normalizedHeaders,
        undefined,
        transportResponse.metadata,
        errorOptions,
      );
    }

    const rawBody = transportResponse.body as Record<string, unknown>;

    // If body is already an HttpResponse object
    if (
      rawBody &&
      typeof rawBody === 'object' &&
      typeof rawBody.status === 'number' &&
      'headers' in rawBody
    ) {
      const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
        rawBody.headers as Record<string, string | readonly string[]>,
      );
      return HttpResponseFactory.createSuccess<TBody>(
        rawBody.status as number,
        rawBody.body as TBody,
        normalizedHeaders,
        rawBody.cookies as Record<string, string>,
        {
          ...(transportResponse.metadata || {}),
          ...((rawBody.metadata as Record<string, unknown>) || {}),
        },
      );
    }

    // 1. Status resolution
    const status = HttpResponseMapper.resolveStatus(transportResponse, execOptions);
    const is204 = status === HTTP_STATUS_CODES.NO_CONTENT;

    const normalizedHeaders = HttpResponseMapper.normalizeHeaders(
      execOptions.metadata?.headers as Record<string, string | readonly string[]>,
    );

    // 2. 204 No Content: Skip serialization completely
    if (is204) {
      return HttpResponseFactory.createSuccess<TBody>(
        HTTP_STATUS_CODES.NO_CONTENT,
        undefined,
        normalizedHeaders,
        undefined,
        transportResponse.metadata,
      );
    }

    // 3. Serialization Engine invocation if present
    if (engine) {
      const requestedMediaType = execOptions.mediaType ?? 'application/json';
      const serResult = await engine.serialize(transportResponse.body, {
        status,
        mediaType: requestedMediaType,
        charset: execOptions.charset,
        serializerId: execOptions.serializerId,
        transformationOptions: {
          fieldsToRedact: execOptions.fieldsToRedact,
          circularPolicy: execOptions.circularPolicy,
        },
        timeoutMs: execOptions.timeoutMs,
        signal: execOptions.signal,
        throwOnError: false,
      });

      if (!serResult.success) {
        const errStatus = HttpErrorMapper.resolveStatus(serResult.error, errorOptions);
        return HttpResponseFactory.createFailure<TBody>(
          errStatus,
          serResult.error,
          normalizedHeaders,
          undefined,
          transportResponse.metadata,
          errorOptions,
        );
      }

      if (!normalizedHeaders['content-type']) {
        normalizedHeaders['content-type'] = serResult.mediaType ?? requestedMediaType;
      }

      return HttpResponseFactory.createSuccess<TBody>(
        status,
        serResult.value as TBody,
        normalizedHeaders,
        undefined,
        transportResponse.metadata,
      );
    }

    // 4. Default without serialization engine
    if (!normalizedHeaders['content-type']) {
      normalizedHeaders['content-type'] = execOptions.mediaType ?? 'application/json';
    }

    return HttpResponseFactory.createSuccess<TBody>(
      status,
      transportResponse.body,
      normalizedHeaders,
      undefined,
      transportResponse.metadata,
    );
  }
}
