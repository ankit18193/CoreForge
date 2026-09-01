import type { HttpResponse, HttpSerializer } from '@coreforge/contracts';

import { HttpSerializerValidationError } from '../errors/HttpSerializationErrors';

export class HttpResponseValidator {
  /**
   * Validate an HttpResponse object against structural rules.
   */
  public static validateResponse<TBody = unknown>(response: unknown): HttpResponse<TBody> {
    if (!response || typeof response !== 'object') {
      throw new HttpSerializerValidationError('Response must be a non-null object');
    }

    const r = response as Record<string, unknown>;

    // 1. Status validation
    if (typeof r['status'] !== 'number' || !Number.isInteger(r['status'])) {
      throw new HttpSerializerValidationError('Response status must be an integer');
    }
    const status = r['status'] as number;
    if (status < 100 || status > 599) {
      throw new HttpSerializerValidationError(
        `Response status '${status}' must be between 100 and 599`,
      );
    }

    // 2. 204 No Content enforcement: body must be undefined
    if (status === 204 && r['body'] !== undefined) {
      throw new HttpSerializerValidationError(
        'Response with status 204 (No Content) must not contain a body',
      );
    }

    // 3. Headers validation
    if (r['headers'] !== undefined) {
      if (
        typeof r['headers'] !== 'object' ||
        r['headers'] === null ||
        Array.isArray(r['headers'])
      ) {
        throw new HttpSerializerValidationError('Response headers must be a record object');
      }
      for (const [key, val] of Object.entries(r['headers'] as Record<string, unknown>)) {
        if (typeof val !== 'string' && !Array.isArray(val)) {
          throw new HttpSerializerValidationError(
            `Header '${key}' value must be a string or array of strings`,
          );
        }
      }
    }

    // 4. Metadata validation
    if (r['metadata'] !== undefined) {
      if (
        typeof r['metadata'] !== 'object' ||
        r['metadata'] === null ||
        Array.isArray(r['metadata'])
      ) {
        throw new HttpSerializerValidationError(
          'Response metadata must be a record object when defined',
        );
      }
    }

    return response as HttpResponse<TBody>;
  }

  /**
   * Validate that an object adheres to the HttpSerializer contract.
   */
  public static validateSerializer(serializer: unknown): HttpSerializer {
    if (!serializer || typeof serializer !== 'object') {
      throw new HttpSerializerValidationError('Serializer must be a non-null object');
    }

    const s = serializer as Record<string, unknown>;

    if (typeof s['id'] !== 'string' || s['id'].trim() === '') {
      throw new HttpSerializerValidationError('Serializer id must be a non-empty string');
    }

    if (typeof s['name'] !== 'string' || s['name'].trim() === '') {
      throw new HttpSerializerValidationError('Serializer name must be a non-empty string');
    }

    if (typeof s['serialize'] !== 'function') {
      throw new HttpSerializerValidationError(
        `Serializer '${String(s['id'])}' must implement a serialize() method`,
      );
    }

    if (!Array.isArray(s['mediaTypes']) || s['mediaTypes'].length === 0) {
      throw new HttpSerializerValidationError(
        `Serializer '${String(s['id'])}' must define a non-empty mediaTypes array`,
      );
    }

    for (const mt of s['mediaTypes']) {
      if (typeof mt !== 'string' || mt.trim() === '') {
        throw new HttpSerializerValidationError(
          `Serializer '${String(s['id'])}' contains an invalid mediaType (must be non-empty string)`,
        );
      }
    }

    if (s['priority'] !== undefined && typeof s['priority'] !== 'number') {
      throw new HttpSerializerValidationError(
        `Serializer '${String(s['id'])}' priority must be a number when defined`,
      );
    }

    return serializer as HttpSerializer;
  }
}
