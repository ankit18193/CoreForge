import { SpanEvent as ISpanEvent } from '@coreforge/contracts';

import { SpanAttributes } from './SpanAttributes';
import { SpanEventError } from '../errors/TracingErrors';
import { TraceLimitsManager } from '../limits/TraceLimitsManager';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export class SpanEvents {
  private readonly _events: ISpanEvent[] = [];
  private readonly _limits: TraceLimitsManager;

  constructor(limits: TraceLimitsManager) {
    this._limits = limits;
  }

  public add(name: unknown, attributes?: Readonly<Record<string, unknown>>): void {
    if (typeof name !== 'string') {
      throw new SpanEventError('Span event name must be a string', { name });
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new SpanEventError('Span event name cannot be empty or whitespace-only', { name });
    }

    if (hasControlCharacters(trimmed)) {
      throw new SpanEventError('Span event name contains invalid control characters', { name });
    }

    this._limits.assertEventLimit(this._events.length);

    let sanitizedAttributes: Readonly<Record<string, unknown>> | undefined;
    if (attributes) {
      const attrHelper = new SpanAttributes(this._limits);
      attrHelper.setMultiple(attributes as Record<string, unknown>);
      sanitizedAttributes = attrHelper.getSnapshot();
    }

    const event: ISpanEvent = Object.freeze({
      name: trimmed,
      timestamp: Date.now(),
      attributes: sanitizedAttributes,
    });

    this._events.push(event);
  }

  public getSnapshot(): readonly ISpanEvent[] {
    return Object.freeze([...this._events]);
  }
}
