import { EventHandlerRegistrationError, EventValidationError } from '../errors/EventErrors';
import {
  EventHandler,
  EventHandlerOptions,
  RegisteredEventHandlerEntry,
} from '../types/eventTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class EventHandlerRegistry {
  private readonly _handlers = new Map<string, RegisteredEventHandlerEntry<unknown>[]>();
  private _sequenceCounter = 0;
  private _locked = false;

  public register<TPayload>(
    type: string,
    handler: EventHandler<TPayload>,
    options?: EventHandlerOptions,
  ): void {
    if (this._locked) {
      throw new EventHandlerRegistrationError(
        'Cannot register handler after event publisher is READY',
        { eventType: type },
      );
    }

    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new EventValidationError('Event type must be a non-empty string', {
        eventType: type,
      });
    }

    if (CONTROL_CHARS_REGEX.test(type)) {
      throw new EventValidationError('Event type contains invalid control characters', {
        eventType: type,
      });
    }

    if (!handler || typeof handler !== 'object') {
      throw new EventHandlerRegistrationError(
        'Handler must be an object implementing EventHandler interface',
        { eventType: type, handler },
      );
    }

    if (typeof handler.handle !== 'function') {
      throw new EventHandlerRegistrationError(
        'Handler must have a handle(event, context) function',
        { eventType: type, handler },
      );
    }

    const priority = options?.priority ?? 0;
    const sequence = ++this._sequenceCounter;
    const handlerName =
      (handler as { name?: string }).name || handler.constructor?.name || 'AnonymousHandler';

    const entry: RegisteredEventHandlerEntry<unknown> = {
      handler: handler as EventHandler<unknown>,
      priority,
      sequence,
      handlerName,
    };

    const list = this._handlers.get(type) ?? [];
    list.push(entry);

    // Sort by priority DESC, then sequence ASC
    list.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);

    this._handlers.set(type, list);
  }

  public lock(): void {
    this._locked = true;
  }

  public get<TPayload = unknown>(type: string): readonly RegisteredEventHandlerEntry<TPayload>[] {
    const list = this._handlers.get(type);
    return (list ?? []) as readonly RegisteredEventHandlerEntry<TPayload>[];
  }

  public has(type: string): boolean {
    const list = this._handlers.get(type);
    return Boolean(list && list.length > 0);
  }

  public getHandlerCount(type: string): number {
    return this._handlers.get(type)?.length ?? 0;
  }

  public get totalHandlers(): number {
    let count = 0;
    for (const list of this._handlers.values()) {
      count += list.length;
    }
    return count;
  }
}
