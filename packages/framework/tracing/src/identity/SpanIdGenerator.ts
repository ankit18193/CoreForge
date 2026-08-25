import * as crypto from 'node:crypto';

import { SpanIdError } from '../errors/TracingErrors';

const SPAN_ID_REGEX = /^[0-9a-f]{16}$/;
const ALL_ZERO_SPAN_ID = '0'.repeat(16);

export class SpanIdGenerator {
  public static generate(): string {
    let id: string;
    do {
      id = crypto.randomBytes(8).toString('hex');
    } while (id === ALL_ZERO_SPAN_ID);
    return id;
  }

  public static validate(spanId: unknown): string {
    if (typeof spanId !== 'string') {
      throw new SpanIdError('Span ID must be a 16-character hexadecimal string', { spanId });
    }

    const lower = spanId.toLowerCase();
    if (!SPAN_ID_REGEX.test(lower)) {
      throw new SpanIdError(
        'Invalid Span ID: must be exactly 16 lowercase hexadecimal characters',
        { spanId },
      );
    }

    if (lower === ALL_ZERO_SPAN_ID) {
      throw new SpanIdError('Invalid Span ID: all-zero span IDs are rejected', { spanId });
    }

    return lower;
  }
}
