import { EventHandlerError } from '../errors/EventErrors';
import { BaseEvent } from '../events/BaseEvent';
import { EventExecutionContext } from '../execution/EventExecutionContext';
import { EventSubscription } from '../subscriptions/EventSubscription';

export class EventDispatcher {
  public async dispatch<T extends BaseEvent<unknown>>(
    event: T,
    subscriptions: EventSubscription<T>[],
  ): Promise<EventExecutionContext> {
    const context = new EventExecutionContext(event.id, event.name, event.timestamp);

    for (const subscription of subscriptions) {
      context.incrementHandlerCount();
      try {
        await subscription.handler(event);
      } catch (err: unknown) {
        const cause = err instanceof Error ? err : new Error(String(err));
        throw new EventHandlerError(
          `Error occurred in event handler for event "${event.name}": ${cause.message}`,
          cause,
          { eventId: event.id, eventName: event.name },
        );
      }
    }

    context.complete();
    return context;
  }
}
