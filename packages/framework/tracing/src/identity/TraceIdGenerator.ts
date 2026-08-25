import * as crypto from 'node:crypto';

import { TraceIdError } from '../errors/TracingErrors';

const TRACE_ID_REGEX = /^[0-9a-f]{32}$/;
const ALL_ZERO_TRACE_ID = '0'.repeat(32);

export class TraceIdGenerator {
  public static generate(): string {
    let id: string;
    do {
      id = crypto.randomBytes(16).toString('hex');
    } while (id === ALL_ZERO_TRACE_ID);
    return id;
  }

  public static validate(traceId: unknown): string {
    if (typeof traceId !== 'string') {
      throw new TraceIdError('Trace ID must be a 32-character hexadecimal string', { traceId });
    }

    const lower = traceId.toLowerCase();
    if (!TRACE_ID_REGEX.test(lower)) {
      throw new TraceIdError(
        'Invalid Trace ID: must be exactly 32 lowercase hexadecimal characters',
        { traceId },
      );
    }

    if (lower === ALL_ZERO_TRACE_ID) {
      throw new TraceIdError('Invalid Trace ID: all-zero trace IDs are rejected', { traceId });
    }

    return lower;
  }
}
