import { MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryOrphanError } from '../errors/DiscoveryErrors';
import { DiscoveryIndex } from '../registry/DiscoveryIndex';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';

export class MiddlewareScanner {
  public scan(
    metadata: MetadataRegistry,
    discoveryRegistry: DiscoveryRegistry,
    discoveryIndex: DiscoveryIndex,
  ): void {
    const list = metadata.resolve(MetadataType.MIDDLEWARE);
    for (const desc of list) {
      if (!desc.parentId) {
        throw new DiscoveryOrphanError(
          `MiddlewareScanner: Middleware "${desc.id}" is missing a parentId mapping.`,
        );
      }

      const parentExists = metadata.index.getById(desc.parentId);
      if (!parentExists) {
        throw new DiscoveryOrphanError(
          `MiddlewareScanner: Middleware "${desc.id}" has parent ID "${desc.parentId}" but parent is not registered.`,
        );
      }

      const item = {
        id: desc.id,
        descriptor: desc,
        dependencies: [desc.parentId],
      };

      discoveryRegistry.add(MetadataType.MIDDLEWARE, item);
      discoveryIndex.index(item);
    }
  }
}
