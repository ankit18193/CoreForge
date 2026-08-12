import { MetadataIndex } from './MetadataIndex';
import { MetadataOptions } from './MetadataOptions';
import { MetadataStore } from './MetadataStore';

export class MetadataConfiguration {
  public readonly store: MetadataStore;
  public readonly index: MetadataIndex;

  constructor(options: MetadataOptions) {
    this.store = options.store;
    this.index = options.index;
    Object.freeze(this);
  }
}
