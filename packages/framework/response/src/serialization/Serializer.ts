import { SerializationContext } from './SerializationContext';

export interface Serializer {
  serialize(value: unknown, context?: SerializationContext): unknown;
}
