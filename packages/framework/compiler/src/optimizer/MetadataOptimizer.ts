import { MetadataDescriptor } from '@coreforge/contracts';

export class MetadataOptimizer {
  public optimize(descriptors: readonly MetadataDescriptor[]): {
    optimizedDescriptors: readonly MetadataDescriptor[];
    savings: number;
  } {
    return {
      optimizedDescriptors: descriptors,
      savings: descriptors.length,
    };
  }
}
