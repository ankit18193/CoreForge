import { EventDescriptor } from './EventDescriptor';
import { EventRegistrationError } from '../errors/EventErrors';
import { BaseEvent } from '../events/BaseEvent';
import { EventSubscription } from '../subscriptions/EventSubscription';
import { EventConstructor, EventHandler } from '../types/eventTypes';

export class EventRegistry {
  private _descriptors = new Map<
    EventConstructor<BaseEvent<unknown>>,
    EventDescriptor<BaseEvent<unknown>>
  >();

  public register<T extends BaseEvent<unknown>>(
    eventType: EventConstructor<T>,
    handler: EventHandler<T>,
  ): EventSubscription<T> {
    if (!eventType || typeof eventType !== 'function') {
      throw new EventRegistrationError(
        'Failed to register handler: event type must be a valid class constructor.',
      );
    }
    if (!handler || typeof handler !== 'function') {
      throw new EventRegistrationError(
        'Failed to register handler: event handler must be a function.',
      );
    }

    const key = eventType as EventConstructor<BaseEvent<unknown>>;
    let descriptor = this._descriptors.get(key);
    if (!descriptor) {
      descriptor = new EventDescriptor(key);
      this._descriptors.set(key, descriptor);
    }

    const subscription = new EventSubscription(eventType, handler);
    descriptor.subscriptions.push(subscription as unknown as EventSubscription<BaseEvent<unknown>>);

    return subscription;
  }

  public remove<T extends BaseEvent<unknown>>(subscription: EventSubscription<T>): void {
    const key = subscription.eventType as EventConstructor<BaseEvent<unknown>>;
    const descriptor = this._descriptors.get(key);
    if (!descriptor) {
      return;
    }

    const filtered = descriptor.subscriptions.filter((sub) => sub.id !== subscription.id);
    if (filtered.length === 0) {
      this._descriptors.delete(key);
    } else {
      descriptor.subscriptions.length = 0;
      descriptor.subscriptions.push(...filtered);
    }
  }

  public getDescriptorFor<T extends BaseEvent<unknown>>(
    eventType: EventConstructor<T>,
  ): EventDescriptor<T> | undefined {
    const key = eventType as EventConstructor<BaseEvent<unknown>>;
    return this._descriptors.get(key) as EventDescriptor<T> | undefined;
  }
}
