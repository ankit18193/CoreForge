import { CommandValidator } from './Command';
import { Command } from '../types/dispatchTypes';

function cloneAndSanitize<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(value as object);

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (Array.isArray(value)) {
    const copy = value.map((item) => cloneAndSanitize(item, seen));
    return Object.freeze(copy) as unknown as T;
  }

  const copy: Record<string | symbol, unknown> = {};
  const propNames = Reflect.ownKeys(value as object);
  for (const prop of propNames) {
    const descriptor = Object.getOwnPropertyDescriptor(value as object, prop);
    if (descriptor && descriptor.enumerable) {
      copy[prop] = cloneAndSanitize((value as Record<string | symbol, unknown>)[prop], seen);
    }
  }

  return Object.freeze(copy) as T;
}

export class CommandSnapshot {
  public static create<TPayload>(command: Command<TPayload>): Command<TPayload> {
    CommandValidator.validate<TPayload>(command);

    const sanitizedPayload = cloneAndSanitize(command.payload);

    return Object.freeze({
      type: command.type,
      payload: sanitizedPayload,
    });
  }
}
