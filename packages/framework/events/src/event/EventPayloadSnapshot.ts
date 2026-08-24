export class EventPayloadSnapshot {
  public static create<T>(payload: T, seen = new WeakSet<object>(), depth = 0): Readonly<T> {
    if (payload === null || payload === undefined || typeof payload !== 'object') {
      return payload;
    }

    if (depth > 20) {
      return '[MAX_DEPTH_EXCEEDED]' as unknown as Readonly<T>;
    }

    if (seen.has(payload as object)) {
      return '[Circular]' as unknown as Readonly<T>;
    }

    seen.add(payload as object);

    if (Array.isArray(payload)) {
      const clonedArr = payload.map((item) => EventPayloadSnapshot.create(item, seen, depth + 1));
      return Object.freeze(clonedArr) as unknown as Readonly<T>;
    }

    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      copy[key] = EventPayloadSnapshot.create(value, seen, depth + 1);
    }

    return Object.freeze(copy) as unknown as Readonly<T>;
  }
}
