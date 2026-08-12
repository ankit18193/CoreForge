import { MetadataIndex } from './MetadataIndex';
import { MetadataStore } from './MetadataStore';

export interface MetadataOptions {
  readonly store: MetadataStore;
  readonly index: MetadataIndex;
}
