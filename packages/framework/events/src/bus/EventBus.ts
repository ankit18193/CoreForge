import { EventBus as IEventBus } from '@coreforge/contracts';

import { EventDispatcher } from '../dispatcher/EventDispatcher';
import { UnknownEventError } from '../errors/EventErrors';
import { BaseEvent } from '../events/BaseEvent';
import { EventExecutionContext } from '../execution/EventExecutionContext';
import { EventRegistry } from '../registry/EventRegistry';
import { EventSubscription } from '../subscriptions/EventSubscription';
import { EventConstructor, EventHandler, EventType } from '../types/eventTypes';

export class EventBus implements IEventBus {
  private _registry = new EventRegistry();
  private _dispatcher = new EventDispatcher();

  public async publish<T extends BaseEvent<unknown>>(event: T): Promise<EventExecutionContext>;
  public async publish(event: unknown): Promise<void>;
  public async publish(event: unknown): Promise<EventExecutionContext | void> {
    const ev = event as BaseEvent<unknown>;
    const constructorRef = ev.constructor as EventConstructor<BaseEvent<unknown>>;
    const descriptor = this._registry.getDescriptorFor(constructorRef);
    const subscriptions = descriptor ? descriptor.subscriptions : [];

    return this._dispatcher.dispatch(ev, subscriptions);
  }

  public subscribe<T extends BaseEvent<unknown>>(
    eventType: EventType<T>,
    handler: EventHandler<T>,
  ): EventSubscription<T> {
    return this._registry.register(eventType, handler);
  }

  public unsubscribe(subscription: unknown): void {
    if (
      !subscription ||
      typeof subscription !== 'object' ||
      !('eventType' in subscription) ||
      !('id' in subscription)
    ) {
      throw new UnknownEventError('Cannot unsubscribe: invalid subscription object.');
    }

    const sub = subscription as EventSubscription<BaseEvent<unknown>>;
    const descriptor = this._registry.getDescriptorFor(sub.eventType);

    if (!descriptor || !descriptor.subscriptions.some((s) => s.id === sub.id)) {
      throw new UnknownEventError('Cannot unsubscribe: subscription not found for event.');
    }

    this._registry.remove(sub);
  }
}
