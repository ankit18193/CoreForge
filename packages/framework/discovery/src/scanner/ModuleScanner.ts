import { MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { DiscoveryIndex } from '../registry/DiscoveryIndex';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';

export class ModuleScanner {
  public scan(
    metadata: MetadataRegistry,
    discoveryRegistry: DiscoveryRegistry,
    discoveryIndex: DiscoveryIndex,
  ): void {
    const list = metadata.resolve(MetadataType.MODULE);
    for (const desc of list) {
      const deps: string[] = (desc as { dependencies?: string[] }).dependencies || [];

      const item = {
        id: desc.id,
        descriptor: desc,
        dependencies: deps,
      };

      discoveryRegistry.add(MetadataType.MODULE, item);
      discoveryIndex.index(item);
    }
  }
}
