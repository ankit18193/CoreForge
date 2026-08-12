import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryConfiguration } from './DiscoveryConfiguration';

export class DiscoveryBuilder {
  private _metadataRegistry?: MetadataRegistry;

  public setMetadataRegistry(registry: MetadataRegistry): this {
    this._metadataRegistry = registry;
    return this;
  }

  public build(): DiscoveryConfiguration {
    if (!this._metadataRegistry) {
      throw new Error('DiscoveryBuilder: metadataRegistry must be specified.');
    }
    return new DiscoveryConfiguration({
      metadataRegistry: this._metadataRegistry,
    });
  }
}
