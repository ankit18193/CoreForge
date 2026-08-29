import {
  ExecutionContext,
  HttpRequest,
  TransportMetadata,
  TransportRequest,
} from '@coreforge/contracts';
import { TransportRequestSnapshot } from '@coreforge/transport';

import { HttpRequestSnapshot } from './HttpRequestSnapshot';

export interface HttpRequestMapperOptions {
  readonly executionContext?: ExecutionContext | undefined;
  readonly extraMetadata?: Record<string, unknown> | undefined;
}

export class HttpRequestMapper {
  public static toTransportRequest<TBody = unknown, TPayload = unknown>(
    rawRequest: HttpRequest<TBody> | unknown,
    options: HttpRequestMapperOptions = {},
  ): TransportRequest<TPayload> {
    const snapshot = HttpRequestSnapshot.create<TBody>(rawRequest);

    let payload: unknown;
    if (snapshot.body !== undefined) {
      payload = snapshot.body;
    } else {
      payload = {
        method: snapshot.method,
        url: snapshot.url,
        path: snapshot.path,
        query: snapshot.query,
        pathParameters: snapshot.pathParameters,
      };
    }

    const metadata: TransportMetadata = {
      transportType: 'http',
      method: snapshot.method,
      url: snapshot.url,
      path: snapshot.path,
      headers: snapshot.headers,
      query: snapshot.query,
      pathParameters: snapshot.pathParameters,
      cookies: snapshot.cookies,
      ...(snapshot.metadata || {}),
      ...(options.extraMetadata || {}),
    };

    const rawTransportRequest = {
      payload,
      metadata,
      context: options.executionContext,
    };

    return TransportRequestSnapshot.create<TPayload>(rawTransportRequest);
  }
}
