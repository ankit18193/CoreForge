import { EventHandlerRegistry } from './EventHandlerRegistry';
import { DomainEvent, EventHandlerRegistration } from '../types/eventTypes';

export class EventHandlerResolver {
  private readonly _registry: EventHandlerRegistry;

  constructor(registry: EventHandlerRegistry) {
    this._registry = registry;
  }

  public resolve(event: DomainEvent): readonly EventHandlerRegistration[] {
    return this._registry.getHandlers(event.type);
  }
}
