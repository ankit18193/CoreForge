import { CacheSerializer } from '@coreforge/contracts';

export class SnapshotSerializer<T = unknown> implements CacheSerializer<T> {
  public serialize(value: T): unknown {
    return this._clone(value, new WeakSet());
  }

  public deserialize(value: unknown): T {
    return this._clone(value, new WeakSet()) as T;
  }

  private _clone(val: unknown, seen: WeakSet<object>): unknown {
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
        copy.push(this._clone(item, seen));
      }
      return copy;
    }

    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(val)) {
      copy[key] = this._clone((val as Record<string, unknown>)[key], seen);
    }
    return copy;
  }
}
