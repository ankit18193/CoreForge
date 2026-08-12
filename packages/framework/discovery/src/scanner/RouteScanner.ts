import { MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryOrphanError } from '../errors/DiscoveryErrors';
import { DiscoveryIndex } from '../registry/DiscoveryIndex';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';

export class RouteScanner {
  public scan(
    metadata: MetadataRegistry,
    discoveryRegistry: DiscoveryRegistry,
    discoveryIndex: DiscoveryIndex,
  ): void {
    const list = metadata.resolve(MetadataType.ROUTE);
    for (const desc of list) {
      if (!desc.parentId) {
        throw new DiscoveryOrphanError(
          `RouteScanner: Route "${desc.id}" is missing a parentId mapping.`,
        );
      }

      const parentExists = metadata.index.getById(desc.parentId);
      if (!parentExists) {
        throw new DiscoveryOrphanError(
          `RouteScanner: Route "${desc.id}" has parent ID "${desc.parentId}" but parent is not registered.`,
        );
      }

      const item = {
        id: desc.id,
        descriptor: desc,
        dependencies: [desc.parentId],
      };

      discoveryRegistry.add(MetadataType.ROUTE, item);
      discoveryIndex.index(item);
    }
  }
}
