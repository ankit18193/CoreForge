import { MetadataDescriptor } from '@coreforge/contracts';

export class RouteOptimizer {
  public optimize(routes: readonly MetadataDescriptor[]): {
    optimizedRoutes: readonly MetadataDescriptor[];
    savings: number;
  } {
    return {
      optimizedRoutes: routes,
      savings: routes.length,
    };
  }
}
