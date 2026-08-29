import { TransportResponse } from '@coreforge/contracts';

import { TransportValidationError } from '../errors/TransportErrors';

export class TransportResponseValidator {
  public static validate<TBody = unknown>(rawResponse: unknown): TransportResponse<TBody> {
    if (rawResponse === null || rawResponse === undefined || typeof rawResponse !== 'object') {
      throw new TransportValidationError(
        `TransportResponse must be a non-null object, received ${typeof rawResponse}`,
      );
    }

    const res = rawResponse as Record<string, unknown>;

    if (typeof res.success !== 'boolean') {
      throw new TransportValidationError(
        'TransportResponse must contain a boolean "success" property',
      );
    }

    if (res.metadata !== undefined && res.metadata !== null) {
      if (typeof res.metadata !== 'object' || Array.isArray(res.metadata)) {
        throw new TransportValidationError(
          'TransportResponse "metadata" must be a non-array object if provided',
        );
      }
    }

    return res as unknown as TransportResponse<TBody>;
  }
}
