import { randomUUID } from 'node:crypto';

import { EventPayloadSnapshot } from './EventPayloadSnapshot';
import { EventPayloadError } from '../errors/EventErrors';
import { DomainEvent } from '../types/eventTypes';

export class EventFactory {
  public static create<T = unknown>(type: string, payload: T, id?: string): DomainEvent<T> {
    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      throw new EventPayloadError('Event type must be a non-empty string.');
    }

    const eventId = id || randomUUID();
    const timestamp = Date.now();
    const frozenPayload = EventPayloadSnapshot.create(payload);

    return Object.freeze({
      id: eventId,
      type: type.trim(),
      timestamp,
      payload: frozenPayload,
    });
  }
}
