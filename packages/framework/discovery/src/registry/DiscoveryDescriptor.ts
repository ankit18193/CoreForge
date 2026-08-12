import { MetadataDescriptor } from '@coreforge/contracts';

export interface DiscoveryDescriptor {
  readonly id: string;
  readonly descriptor: MetadataDescriptor;
  readonly dependencies: readonly string[];
}
