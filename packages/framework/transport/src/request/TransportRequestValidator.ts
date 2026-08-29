import { TransportRequest } from '@coreforge/contracts';

import { TransportValidationError } from '../errors/TransportErrors';

export class TransportRequestValidator {
  public static validate<TPayload = unknown>(rawRequest: unknown): TransportRequest<TPayload> {
    if (rawRequest === null || rawRequest === undefined || typeof rawRequest !== 'object') {
      throw new TransportValidationError(
        `TransportRequest must be a non-null object, received ${typeof rawRequest}`,
      );
    }

    const req = rawRequest as Record<string, unknown>;

    if (!('payload' in req)) {
      throw new TransportValidationError('TransportRequest must contain a "payload" property');
    }

    if (req.metadata !== undefined && req.metadata !== null) {
      if (typeof req.metadata !== 'object' || Array.isArray(req.metadata)) {
        throw new TransportValidationError(
          'TransportRequest "metadata" must be a non-array object if provided',
        );
      }
    }

    if (req.context !== undefined && req.context !== null) {
      if (typeof req.context !== 'object') {
        throw new TransportValidationError(
          'TransportRequest "context" must be an ExecutionContext object if provided',
        );
      }
    }

    return req as unknown as TransportRequest<TPayload>;
  }
}
