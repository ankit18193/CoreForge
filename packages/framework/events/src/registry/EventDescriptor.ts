import { BaseEvent } from '../events/BaseEvent';
import { EventSubscription } from '../subscriptions/EventSubscription';
import { EventConstructor } from '../types/eventTypes';

export class EventDescriptor<T extends BaseEvent<unknown> = BaseEvent<unknown>> {
  public readonly eventType: EventConstructor<T>;
  public readonly subscriptions: EventSubscription<T>[] = [];

  constructor(eventType: EventConstructor<T>) {
    this.eventType = eventType;
  }
}
