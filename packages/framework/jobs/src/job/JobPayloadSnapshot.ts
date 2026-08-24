export class JobPayloadSnapshot {
  public static snapshot<T>(val: T): T {
    const cloned = JobPayloadSnapshot._clone(val, new WeakSet());
    return JobPayloadSnapshot._deepFreeze(cloned) as T;
  }

  private static _clone(val: unknown, seen: WeakSet<object>): unknown {
    if (val === null || typeof val !== 'object') {
      return val;
    }

    if (val instanceof Date) {
      return new Date(val.getTime());
    }

    if (val instanceof RegExp) {
      return new RegExp(val.source, val.flags);
    }

    if (Buffer.isBuffer(val)) {
      return Buffer.from(val);
    }

    if (seen.has(val)) {
      return '[Circular]';
    }

    seen.add(val);

    if (Array.isArray(val)) {
      const copy: unknown[] = [];
      for (const item of val) {
        copy.push(JobPayloadSnapshot._clone(item, seen));
      }
      return copy;
    }

    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(val)) {
      copy[key] = JobPayloadSnapshot._clone((val as Record<string, unknown>)[key], seen);
    }
    return copy;
  }

  private static _deepFreeze(val: unknown): unknown {
    if (val === null || typeof val !== 'object') {
      return val;
    }

    Object.freeze(val);

    if (Array.isArray(val)) {
      for (const item of val) {
        JobPayloadSnapshot._deepFreeze(item);
      }
    } else {
      for (const key of Object.keys(val)) {
        JobPayloadSnapshot._deepFreeze((val as Record<string, unknown>)[key]);
      }
    }

    return val;
  }
}
