import type { HttpEndpoint } from '@coreforge/contracts';

import { HttpEndpointRegistry } from './HttpEndpointRegistry';
import { RegisteredEndpointEntry } from '../types/httpControllerTypes';

export class HttpEndpointResolver {
  private readonly _registry: HttpEndpointRegistry;

  constructor(registry: HttpEndpointRegistry) {
    this._registry = registry;
  }

  /**
   * Resolve all enabled endpoints ordered by:
   *   1. priority DESC
   *   2. registration sequence ASC
   */
  public resolve(): readonly HttpEndpoint[] {
    return this.resolveEntries().map((e) => e.endpoint);
  }

  public resolveEntries(): readonly RegisteredEndpointEntry[] {
    return [...this._registry.listEntries()]
      .filter((e) => e.enabled)
      .sort((a, b) => {
        const byPriority = b.priority - a.priority;
        return byPriority !== 0 ? byPriority : a.sequence - b.sequence;
      });
  }

  public resolveByRouteId(routeId: string): HttpEndpoint | undefined {
    const entry = this._registry
      .listEntries()
      .find((e) => e.endpoint.routeId === routeId && e.enabled);
    return entry?.endpoint;
  }

  public resolveById(endpointId: string): HttpEndpoint | undefined {
    return this._registry.get(endpointId);
  }
}
