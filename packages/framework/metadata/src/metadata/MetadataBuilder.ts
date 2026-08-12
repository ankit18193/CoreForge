import { MetadataConfiguration } from './MetadataConfiguration';
import { MetadataIndex } from './MetadataIndex';
import { MetadataStore } from './MetadataStore';

export class MetadataBuilder {
  private readonly _store = new MetadataStore();
  private readonly _index = new MetadataIndex();

  public build(): MetadataConfiguration {
    return new MetadataConfiguration({
      store: this._store,
      index: this._index,
    });
  }
}
