import { HttpResponse, TransportResponse } from '@coreforge/contracts';

import { HttpErrorMapper } from './HttpErrorMapper';
import { HttpResponseFactory } from './HttpResponseFactory';
import { HttpErrorMappingOptions } from '../types/httpTypes';

export class HttpResponseMapper {
  public static toHttpResponse<TBody = unknown>(
    transportResponse: TransportResponse<TBody>,
    options: HttpErrorMappingOptions = {},
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
        return HttpResponseFactory.createSuccess<TBody>(
          rawBody.status as number,
          rawBody.body as TBody,
          rawBody.headers as Record<string, string | readonly string[]>,
          rawBody.cookies as Record<string, string>,
          {
            ...(transportResponse.metadata || {}),
            ...((rawBody.metadata as Record<string, unknown>) || {}),
          },
        );
      }

      return HttpResponseFactory.createSuccess<TBody>(
        undefined,
        transportResponse.body,
        {},
        undefined,
        transportResponse.metadata,
      );
    }

    const status = HttpErrorMapper.resolveStatus(transportResponse.error, options);
    return HttpResponseFactory.createFailure<TBody>(
      status,
      transportResponse.error,
      {},
      undefined,
      transportResponse.metadata,
      options,
    );
  }
}
