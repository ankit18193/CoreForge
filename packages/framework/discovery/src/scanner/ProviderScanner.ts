import { MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryOrphanError } from '../errors/DiscoveryErrors';
import { DiscoveryIndex } from '../registry/DiscoveryIndex';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';

export class ProviderScanner {
  public scan(
    metadata: MetadataRegistry,
    discoveryRegistry: DiscoveryRegistry,
    discoveryIndex: DiscoveryIndex,
  ): void {
    const list = metadata.resolve(MetadataType.PROVIDER);
    for (const desc of list) {
      if (!desc.parentId) {
        throw new DiscoveryOrphanError(
          `ProviderScanner: Provider "${desc.id}" is missing a parentId mapping.`,
        );
      }

      const parentModule = discoveryIndex.getById(desc.parentId);
      if (!parentModule) {
        throw new DiscoveryOrphanError(
          `ProviderScanner: Provider "${desc.id}" has parent ID "${desc.parentId}" but parent Module is not registered.`,
        );
      }

      const item = {
        id: desc.id,
        descriptor: desc,
        dependencies: [desc.parentId],
      };

      discoveryRegistry.add(MetadataType.PROVIDER, item);
      discoveryIndex.index(item);
    }
  }
}
