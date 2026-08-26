import { QueryValidationError } from '../errors/QueryErrors';
import { Query } from '../types/queryTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class QueryValidator {
  public static validate<TPayload>(query: unknown): asserts query is Query<TPayload> {
    if (!query || typeof query !== 'object') {
      throw new QueryValidationError('Query must be a non-null object', { query });
    }

    const q = query as Record<string, unknown>;

    if (typeof q.type !== 'string') {
      throw new QueryValidationError('Query type must be a string', { query });
    }

    const trimmed = q.type.trim();
    if (trimmed.length === 0) {
      throw new QueryValidationError('Query type cannot be empty or whitespace-only', { query });
    }

    if (CONTROL_CHARS_REGEX.test(q.type)) {
      throw new QueryValidationError('Query type contains invalid control characters', {
        queryType: q.type,
      });
    }
  }
}
