import { EventValidationError } from '../errors/EventErrors';
import { Event } from '../types/eventTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class EventValidator {
  public static validate<TPayload>(event: unknown): asserts event is Event<TPayload> {
    if (!event || typeof event !== 'object') {
      throw new EventValidationError('Event must be a non-null object', { event });
    }

    const e = event as Record<string, unknown>;

    if (typeof e.type !== 'string') {
      throw new EventValidationError('Event type must be a string', { event });
    }

    const trimmed = e.type.trim();
    if (trimmed.length === 0) {
      throw new EventValidationError('Event type cannot be empty or whitespace-only', { event });
    }

    if (CONTROL_CHARS_REGEX.test(e.type)) {
      throw new EventValidationError('Event type contains invalid control characters', {
        eventType: e.type,
      });
    }
  }
}
