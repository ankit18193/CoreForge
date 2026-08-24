import { randomUUID } from 'node:crypto';

import { EventRegistrationError } from '../errors/EventErrors';
import {
  DomainEvent,
  EventHandler,
  EventHandlerOptions,
  EventHandlerRegistration,
} from '../types/eventTypes';

export class EventHandlerRegistry {
  private readonly _handlersByEvent = new Map<string, EventHandlerRegistration[]>();
  private readonly _handlersById = new Map<string, EventHandlerRegistration>();
  private _nextRegistrationIndex = 0;

  public register<T extends DomainEvent = DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options: EventHandlerOptions = {},
  ): EventHandlerRegistration<T> {
    if (!eventType || typeof eventType !== 'string' || eventType.trim().length === 0) {
      throw new EventRegistrationError('Event type must be a non-empty string.');
    }

    if (typeof handler !== 'function') {
      throw new EventRegistrationError('Event handler must be a function.');
    }

    const id = randomUUID();
    const priority = typeof options.priority === 'number' ? options.priority : 0;
    const registrationIndex = this._nextRegistrationIndex++;

    const registration: EventHandlerRegistration<T> = Object.freeze({
      id,
      eventType: eventType.trim(),
      handler,
      priority,
      registrationIndex,
      retry: options.retry,
    });

    const list = this._handlersByEvent.get(registration.eventType) || [];
    list.push(registration as unknown as EventHandlerRegistration);
    // Sort by priority DESC, then registrationIndex ASC
    list.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.registrationIndex - b.registrationIndex;
    });

    this._handlersByEvent.set(registration.eventType, list);
    this._handlersById.set(id, registration as unknown as EventHandlerRegistration);

    return registration;
  }

  public unregister(id: string): boolean {
    const registration = this._handlersById.get(id);
    if (!registration) {
      return false;
    }

    this._handlersById.delete(id);
    const list = this._handlersByEvent.get(registration.eventType);
    if (list) {
      const filtered = list.filter((h) => h.id !== id);
      if (filtered.length === 0) {
        this._handlersByEvent.delete(registration.eventType);
      } else {
        this._handlersByEvent.set(registration.eventType, filtered);
      }
    }

    return true;
  }

  public getHandlers(eventType: string): readonly EventHandlerRegistration[] {
    const list = this._handlersByEvent.get(eventType);
    return list ? Object.freeze([...list]) : Object.freeze([]);
  }

  public get count(): number {
    return this._handlersById.size;
  }

  public clear(): void {
    this._handlersByEvent.clear();
    this._handlersById.clear();
    this._nextRegistrationIndex = 0;
  }
}
