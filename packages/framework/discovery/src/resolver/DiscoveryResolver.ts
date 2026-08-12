import { MetadataDescriptor, MetadataType } from '@coreforge/contracts';

import { DiscoveryResult } from './DiscoveryResult';
import { DependencyGraph } from '../graph/DependencyGraph';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';

export class DiscoveryResolver {
  private readonly _registry: DiscoveryRegistry;

  constructor(registry: DiscoveryRegistry) {
    this._registry = registry;
  }

  public resolve(graph: DependencyGraph): DiscoveryResult {
    const extract = (type: MetadataType): MetadataDescriptor[] => {
      return this._registry.getByType(type).map((item) => item.descriptor);
    };

    return new DiscoveryResult({
      graph,
      modules: extract(MetadataType.MODULE),
      controllers: extract(MetadataType.CONTROLLER),
      providers: extract(MetadataType.PROVIDER),
      routes: extract(MetadataType.ROUTE),
      middleware: extract(MetadataType.MIDDLEWARE),
      interceptors: extract(MetadataType.INTERCEPTOR),
      security: extract(MetadataType.SECURITY),
    });
  }
}
