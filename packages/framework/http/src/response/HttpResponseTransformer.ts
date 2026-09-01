import type {
  HttpResponseTransformationOptions,
  HttpResponseTransformer,
} from '@coreforge/contracts';

import { HttpResponseSnapshot } from './HttpResponseSnapshot';
import { HttpResponseTransformationError } from '../errors/HttpSerializationErrors';

export class DefaultHttpResponseTransformer implements HttpResponseTransformer<unknown, unknown> {
  public readonly id: string;

  constructor(id = 'default-transformer') {
    this.id = id;
  }

  public transform(value: unknown, options: HttpResponseTransformationOptions = {}): unknown {
    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    try {
      const circularPolicy = options.circularPolicy ?? 'ERROR';
      const cloned = HttpResponseSnapshot.cloneValue(value, circularPolicy);

      const redactList = options.fieldsToRedact;
      if (!redactList || redactList.length === 0) {
        return cloned;
      }

      const redactSet = new Set(redactList.map((f) => f.toLowerCase().trim()));
      return this._redactRecursive(cloned, redactSet);
    } catch (err: unknown) {
      if (err instanceof HttpResponseTransformationError) {
        throw err;
      }
      throw new HttpResponseTransformationError(
        `Response transformation failed: ${err instanceof Error ? err.message : String(err)}`,
        this.id,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private _redactRecursive(val: unknown, redactSet: Set<string>): unknown {
    if (val === null || typeof val !== 'object') {
      return val;
    }

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        val[i] = this._redactRecursive(val[i], redactSet);
      }
      return val;
    }

    const obj = val as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (redactSet.has(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = this._redactRecursive(obj[key], redactSet);
      }
    }

    return obj;
  }
}
