import { ErrorDescriptor } from '../types/exceptionTypes';

export interface TransportNeutralErrorResponse {
  readonly status: number;
  readonly headers: {
    readonly values: Readonly<Record<string, string>>;
  };
  readonly contentType: string;
  readonly body: ErrorDescriptor;
}

export class ErrorResponseMapper {
  public static map(descriptor: ErrorDescriptor): TransportNeutralErrorResponse {
    return Object.freeze({
      status: descriptor.status,
      headers: Object.freeze({
        values: Object.freeze({
          'content-type': 'application/json; charset=utf-8',
        }),
      }),
      contentType: 'application/json; charset=utf-8',
      body: descriptor,
    });
  }
}
