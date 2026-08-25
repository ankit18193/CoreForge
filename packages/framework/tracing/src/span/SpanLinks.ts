import { SpanLink as ISpanLink, TraceContext } from '@coreforge/contracts';

import { SpanAttributes } from './SpanAttributes';
import { SpanLinkError } from '../errors/TracingErrors';
import { SpanIdGenerator } from '../identity/SpanIdGenerator';
import { TraceIdGenerator } from '../identity/TraceIdGenerator';
import { TraceLimitsManager } from '../limits/TraceLimitsManager';

export class SpanLinks {
  private readonly _links: ISpanLink[] = [];
  private readonly _limits: TraceLimitsManager;

  constructor(limits: TraceLimitsManager) {
    this._limits = limits;
  }

  public add(context: unknown, attributes?: Readonly<Record<string, unknown>>): void {
    if (!context || typeof context !== 'object') {
      throw new SpanLinkError('Span link target must be a valid TraceContext object', { context });
    }

    const ctx = context as TraceContext;
    const traceId = TraceIdGenerator.validate(ctx.traceId);
    const spanId = SpanIdGenerator.validate(ctx.spanId);

    this._limits.assertLinkLimit(this._links.length);

    let sanitizedAttributes: Readonly<Record<string, unknown>> | undefined;
    if (attributes) {
      const attrHelper = new SpanAttributes(this._limits);
      attrHelper.setMultiple(attributes as Record<string, unknown>);
      sanitizedAttributes = attrHelper.getSnapshot();
    }

    const link: ISpanLink = Object.freeze({
      traceId,
      spanId,
      attributes: sanitizedAttributes,
    });

    this._links.push(link);
  }

  public getSnapshot(): readonly ISpanLink[] {
    return Object.freeze([...this._links]);
  }
}
