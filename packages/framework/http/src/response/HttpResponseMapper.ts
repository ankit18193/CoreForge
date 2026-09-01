import { HttpResponse, TransportResponse } from '@coreforge/contracts';

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
    const rawBody = transportResponse.body as Record<string, unknown> | undefined;
    if (
      rawBody &&
      typeof rawBody === 'object' &&
      typeof rawBody['status'] === 'number' &&
      Number.isInteger(rawBody['status'])
    ) {
      return rawBody['status'];
    }

    const meta = transportResponse.metadata as Record<string, unknown> | undefined;
    if (meta && typeof meta['status'] === 'number' && Number.isInteger(meta['status'])) {
      return meta['status'];
    }

    if (meta && (meta['isCreated'] === true || meta['created'] === true)) {
      return HTTP_STATUS_CODES.CREATED;
    }

    if (meta && (meta['noContent'] === true || meta['isNoContent'] === true)) {
      return HTTP_STATUS_CODES.NO_CONTENT;
    }

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
   * Synchronous mapping for backward-compatibility and non-serialized execution.
   */
  public static toHttpResponse<TBody = unknown>(
    transportResponse: TransportResponse<TBody>,
    errorOptions: HttpErrorMappingOptions = {},
    execOptions: HttpExecutionOptions = {},
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

    const status = HttpErrorMapper.resolveStatus(transportResponse.error, errorOptions);
    return HttpResponseFactory.createFailure<TBody>(
      status,
      transportResponse.error,
      {},
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
  ): Promise<HttpResponse<TBody>> {
    if (!transportResponse.success) {
      const status = HttpErrorMapper.resolveStatus(transportResponse.error, errorOptions);
      return HttpResponseFactory.createFailure<TBody>(
        status,
        transportResponse.error,
        {},
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
