import { ContentSerializer } from './ContentSerializer';
import { UnsupportedMediaTypeError } from '../errors/SerializationErrors';

export class SerializerRegistry {
  private readonly _serializers = new Map<string, ContentSerializer>();

  public register(mediaType: string, serializer: ContentSerializer): void {
    this._serializers.set(mediaType, serializer);
  }

  public get(mediaType: string): ContentSerializer {
    const serializer = this._serializers.get(mediaType);
    if (!serializer) {
      throw new UnsupportedMediaTypeError(
        `SerializerRegistry: no serializer registered for media type "${mediaType}".`,
      );
    }
    return serializer;
  }

  public has(mediaType: string): boolean {
    return this._serializers.has(mediaType);
  }

  public getMediaTypeCounts(): number {
    return this._serializers.size;
  }

  public clear(): void {
    this._serializers.clear();
  }
}
