import { TransportMetadata, TransportRequest } from '@coreforge/contracts';

import { TransportRequestValidator } from './TransportRequestValidator';

function deepCloneAndSanitize<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (seen.has(value)) {
    return '[Circular]' as unknown as T;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const copy = value.map((item) => deepCloneAndSanitize(item, seen));
    return copy as unknown as T;
  }

  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    copy[k] = deepCloneAndSanitize(v, seen);
  }

  return copy as unknown as T;
}

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return obj;
  }

  seen.add(obj);

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        deepFreeze(item, seen);
      }
    }
  } else {
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        deepFreeze(val, seen);
      }
    }
  }

  return obj;
}

export class TransportRequestSnapshot {
  public static create<TPayload = unknown>(request: unknown): TransportRequest<TPayload> {
    const validated = TransportRequestValidator.validate<TPayload>(request);

    const clonedPayload = deepCloneAndSanitize(validated.payload);
    const clonedMetadata = deepCloneAndSanitize(validated.metadata || {}) as TransportMetadata;

    const frozenPayload = deepFreeze(clonedPayload);
    const frozenMetadata = deepFreeze(clonedMetadata);

    const snapshot: TransportRequest<TPayload> = {
      payload: frozenPayload,
      metadata: frozenMetadata,
      context: validated.context,
    };

    return Object.freeze(snapshot);
  }
}
