import { SerializerConfiguration } from './SerializerConfiguration';
import { MediaType } from '../negotiation/MediaType';
import { BinarySerializer } from '../serializers/BinarySerializer';
import { ContentSerializer } from '../serializers/ContentSerializer';
import { JsonSerializer } from '../serializers/JsonSerializer';
import { SerializerRegistry } from '../serializers/SerializerRegistry';
import { TextSerializer } from '../serializers/TextSerializer';

export class SerializerBuilder {
  private readonly _registry = new SerializerRegistry();

  constructor() {
    this._registry.register(MediaType.JSON, new JsonSerializer());
    this._registry.register(MediaType.TEXT, new TextSerializer());
    this._registry.register(MediaType.BINARY, new BinarySerializer());
  }

  public registerSerializer(mediaType: string, serializer: ContentSerializer): this {
    this._registry.register(mediaType, serializer);
    return this;
  }

  public build(): SerializerConfiguration {
    return new SerializerConfiguration({
      registry: this._registry,
    });
  }
}
