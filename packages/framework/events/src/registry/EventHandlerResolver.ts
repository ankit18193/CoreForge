import { EventHandlerRegistry } from './EventHandlerRegistry';
import { RegisteredEventHandlerEntry } from '../types/eventTypes';

export class EventHandlerResolver {
  public static resolve<TPayload = unknown>(
    registry: EventHandlerRegistry,
    eventType: string,
  ): readonly RegisteredEventHandlerEntry<TPayload>[] {
    return registry.get<TPayload>(eventType);
  }
}
