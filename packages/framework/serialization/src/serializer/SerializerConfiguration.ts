import { SerializerOptions } from './SerializerOptions';
import { SerializerRegistry } from '../serializers/SerializerRegistry';

export class SerializerConfiguration {
  public readonly registry: SerializerRegistry;

  constructor(options: SerializerOptions) {
    this.registry = options.registry;
    Object.freeze(this);
  }
}
