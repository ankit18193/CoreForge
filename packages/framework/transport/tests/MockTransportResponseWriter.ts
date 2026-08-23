import { ResponseDescriptor, TransportResponseWriter } from '../src/types/transportTypes';

export interface MockNativeResponse {
  statusCode?: number;
  headers: Record<string, string | readonly string[]>;
  body?: unknown;
  written: boolean;
}

export class MockTransportResponseWriter implements TransportResponseWriter<MockNativeResponse> {
  public async write(response: MockNativeResponse, descriptor: ResponseDescriptor): Promise<void> {
    response.statusCode = descriptor.status;
    response.headers = { ...(descriptor.headers?.values ?? {}) };
    if (descriptor.contentType) {
      response.headers['content-type'] = descriptor.contentType;
    }
    response.body = descriptor.body;
    response.written = true;
  }
}
