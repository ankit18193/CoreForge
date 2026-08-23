import { CircularReferenceDetector } from './CircularReferenceDetector';
import { SerializationOptions } from '../types/responseTypes';

export class SerializationContext {
  public depth = 0;
  public readonly circularDetector = new CircularReferenceDetector();
  public readonly options: SerializationOptions;

  constructor(options: SerializationOptions = {}) {
    this.options = {
      maxDepth: 100,
      serializeDateAsIso: true,
      serializeBigIntAsString: true,
      ...options,
    };
  }
}
