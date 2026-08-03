import { BaseEvent } from '../events/BaseEvent';

export type EventConstructor<T extends BaseEvent<unknown> = BaseEvent<unknown>> = new (
  ...args: never[]
) => T;

export type EventType<T extends BaseEvent<unknown>> = EventConstructor<T>;

export type EventHandler<T extends BaseEvent<unknown> = BaseEvent<unknown>> = (
  event: T,
) => Promise<void> | void;
