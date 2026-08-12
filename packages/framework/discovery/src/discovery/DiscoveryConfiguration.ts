import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryOptions } from './DiscoveryOptions';

export class DiscoveryConfiguration {
  public readonly metadataRegistry: MetadataRegistry;

  constructor(options: DiscoveryOptions) {
    this.metadataRegistry = options.metadataRegistry;
    Object.freeze(this);
  }
}
