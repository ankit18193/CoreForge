import { MetadataDescriptor } from '@coreforge/contracts';

export class ProviderOptimizer {
  public optimize(providers: readonly MetadataDescriptor[]): {
    optimizedProviders: readonly MetadataDescriptor[];
    savings: number;
  } {
    return {
      optimizedProviders: providers,
      savings: providers.length,
    };
  }
}
