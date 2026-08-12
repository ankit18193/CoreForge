import { MediaTypeResolver } from './MediaTypeResolver';
import { ContentSerializer } from '../serializers/ContentSerializer';
import { SerializerRegistry } from '../serializers/SerializerRegistry';

export class ContentNegotiator {
  private readonly _mediaTypeResolver = new MediaTypeResolver();
  private readonly _registry: SerializerRegistry;

  constructor(registry: SerializerRegistry) {
    this._registry = registry;
  }

  public negotiate(
    acceptHeader?: string,
    body?: unknown,
  ): { mediaType: string; serializer: ContentSerializer } {
    const mediaType = this._mediaTypeResolver.resolve(acceptHeader, body);
    const serializer = this._registry.get(mediaType);
    return { mediaType, serializer };
  }
}
