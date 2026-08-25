import { TraceContext as ITraceContext } from '@coreforge/contracts';

import { TraceContextError } from '../errors/TracingErrors';
import { SpanIdGenerator } from '../identity/SpanIdGenerator';
import { TraceIdGenerator } from '../identity/TraceIdGenerator';

export class TraceContextFactory {
  public static create(options: {
    traceId: string;
    spanId: string;
    parentSpanId?: string | undefined;
    sampled: boolean;
  }): ITraceContext {
    const traceId = TraceIdGenerator.validate(options.traceId);
    const spanId = SpanIdGenerator.validate(options.spanId);
    const parentSpanId = options.parentSpanId
      ? SpanIdGenerator.validate(options.parentSpanId)
      : undefined;

    if (parentSpanId && parentSpanId === spanId) {
      throw new TraceContextError('A span cannot be its own parent', { spanId, parentSpanId });
    }

    return Object.freeze({
      traceId,
      spanId,
      parentSpanId,
      sampled: Boolean(options.sampled),
    });
  }
}
