import { SerializationContext } from './SerializationContext';
import { Serializer } from './Serializer';
import { ResponseSerializationError } from '../errors/ResponseErrors';

export class JsonSerializer implements Serializer {
  public serialize(
    value: unknown,
    context: SerializationContext = new SerializationContext(),
  ): unknown {
    return this._serializeValue(value, context, undefined);
  }

  private _serializeValue(
    value: unknown,
    context: SerializationContext,
    propertyKey?: string | number,
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;

    if (type === 'string' || type === 'number' || type === 'boolean') {
      return value;
    }

    if (type === 'bigint') {
      return context.options.serializeBigIntAsString !== false
        ? (value as bigint).toString()
        : Number(value);
    }

    if (type === 'function' || type === 'symbol') {
      return undefined;
    }

    if (type === 'object') {
      if (value instanceof Date) {
        return context.options.serializeDateAsIso !== false ? value.toISOString() : value.getTime();
      }

      if (context.depth >= (context.options.maxDepth ?? 100)) {
        throw new ResponseSerializationError(
          `Max serialization depth (${context.options.maxDepth}) exceeded at path ${context.circularDetector.currentPath}.`,
        );
      }

      const obj = value as object;
      context.circularDetector.enter(obj, propertyKey);
      context.depth++;

      try {
        if (Array.isArray(obj)) {
          const result: unknown[] = [];
          for (let i = 0; i < obj.length; i++) {
            result.push(this._serializeValue(obj[i], context, i));
          }
          return result;
        }

        // Plain object or class instance
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          const serializedChild = this._serializeValue(v, context, k);
          if (serializedChild !== undefined) {
            result[k] = serializedChild;
          }
        }
        return result;
      } finally {
        context.depth--;
        context.circularDetector.leave(obj, propertyKey !== undefined);
      }
    }

    return String(value);
  }
}
