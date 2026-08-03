import { BaseEvent } from '../events/BaseEvent';
import { EventConstructor, EventHandler } from '../types/eventTypes';

export class EventSubscription<T extends BaseEvent<unknown> = BaseEvent<unknown>> {
  public readonly id: string;
  public readonly eventType: EventConstructor<T>;
  public readonly handler: EventHandler<T>;

  constructor(eventType: EventConstructor<T>, handler: EventHandler<T>) {
    this.id = Math.random().toString(36).substring(2, 15);
    this.eventType = eventType;
    this.handler = handler;
  }
}
