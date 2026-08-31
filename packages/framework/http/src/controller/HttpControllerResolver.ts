import type { HttpController } from '@coreforge/contracts';

import { HttpControllerRegistry } from './HttpControllerRegistry';
import { RegisteredControllerEntry } from '../types/httpControllerTypes';

export class HttpControllerResolver {
  private readonly _registry: HttpControllerRegistry;

  constructor(registry: HttpControllerRegistry) {
    this._registry = registry;
  }

  /**
   * Resolve all controllers ordered by:
   *   1. priority DESC (higher priority first)
   *   2. registration sequence ASC (FIFO among equals)
   */
  public resolve(): readonly HttpController[] {
    return this.resolveEntries().map((e) => e.controller);
  }

  public resolveEntries(): readonly RegisteredControllerEntry[] {
    return [...this._registry.listEntries()].sort((a, b) => {
      const byPriority = b.priority - a.priority;
      return byPriority !== 0 ? byPriority : a.sequence - b.sequence;
    });
  }

  public resolveById(controllerId: string): HttpController | undefined {
    return this._registry.get(controllerId);
  }
}
