import { TransportResponseHeaders } from './TransportResponseHeaders';
import { ResponseDescriptor, TransportResponse } from '../types/transportTypes';

export class TransportResponseMapper {
  public static map(descriptor: ResponseDescriptor): TransportResponse {
    const rawHeaders = descriptor.headers?.values ?? {};
    const normalizedHeaders = TransportResponseHeaders.normalize(rawHeaders);

    const headersWithContentType: Record<string, string | readonly string[]> = {
      ...normalizedHeaders,
    };

    if (descriptor.contentType && !headersWithContentType['content-type']) {
      headersWithContentType['content-type'] = descriptor.contentType;
    }

    return Object.freeze({
      status: descriptor.status,
      headers: Object.freeze(headersWithContentType),
      contentType: descriptor.contentType,
      body: descriptor.body,
    });
  }
}
