import { MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryOrphanError } from '../errors/DiscoveryErrors';
import { DiscoveryIndex } from '../registry/DiscoveryIndex';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';

export class SecurityScanner {
  public scan(
    metadata: MetadataRegistry,
    discoveryRegistry: DiscoveryRegistry,
    discoveryIndex: DiscoveryIndex,
  ): void {
    const list = metadata.resolve(MetadataType.SECURITY);
    for (const desc of list) {
      if (!desc.parentId) {
        throw new DiscoveryOrphanError(
          `SecurityScanner: Security metadata "${desc.id}" is missing a parentId mapping.`,
        );
      }

      const parentExists = metadata.index.getById(desc.parentId);
      if (!parentExists) {
        throw new DiscoveryOrphanError(
          `SecurityScanner: Security metadata "${desc.id}" has parent ID "${desc.parentId}" but parent is not registered.`,
        );
      }

      const item = {
        id: desc.id,
        descriptor: desc,
        dependencies: [desc.parentId],
      };

      discoveryRegistry.add(MetadataType.SECURITY, item);
      discoveryIndex.index(item);
    }
  }
}
