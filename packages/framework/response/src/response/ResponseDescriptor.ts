import { ResponseHeaders } from './ResponseHeaders';
import { InvalidResponseStatusError } from '../errors/ResponseErrors';
import {
  ResponseDescriptor as IResponseDescriptor,
  ResponseHeaders as IResponseHeaders,
  ResponseStatus,
} from '../types/responseTypes';

export class ResponseDescriptor<T = unknown> implements IResponseDescriptor<T> {
  public readonly status: ResponseStatus;
  public readonly headers: IResponseHeaders;
  public readonly contentType?: string | undefined;
  public readonly body: T;

  constructor(options: {
    status: ResponseStatus;
    headers?: IResponseHeaders | Readonly<Record<string, string | readonly string[]>>;
    contentType?: string | undefined;
    body: T;
  }) {
    ResponseDescriptor.validateStatus(options.status);

    this.status = options.status;
    this.headers = ResponseHeaders.from(options.headers);
    this.contentType = options.contentType;
    this.body = options.body;

    Object.freeze(this);
  }

  public static validateStatus(status: unknown): asserts status is ResponseStatus {
    if (typeof status !== 'number' || !Number.isInteger(status) || status < 100 || status > 599) {
      throw new InvalidResponseStatusError(status);
    }
  }

  public static isResponseDescriptor(value: unknown): value is IResponseDescriptor {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.status === 'number' &&
      typeof candidate.headers === 'object' &&
      candidate.headers !== null &&
      'body' in candidate
    );
  }
}
