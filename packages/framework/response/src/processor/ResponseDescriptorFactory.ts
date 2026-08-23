import { ResponseDescriptor } from '../response/ResponseDescriptor';
import { NormalizedResult } from '../types/responseTypes';

export class ResponseDescriptorFactory {
  public static create<T>(normalized: NormalizedResult<T>): ResponseDescriptor<T> {
    return new ResponseDescriptor<T>({
      status: normalized.status,
      headers: normalized.headers,
      contentType: normalized.contentType,
      body: normalized.body,
    });
  }
}
