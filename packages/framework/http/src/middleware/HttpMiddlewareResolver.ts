import type {
  HttpMiddleware,
  HttpMiddlewareResolver as IHttpMiddlewareResolver,
} from '@coreforge/contracts';

import { HttpMiddlewareRegistry } from './HttpMiddlewareRegistry';
import { RegisteredMiddlewareEntry } from '../types/httpMiddlewareTypes';

export class HttpMiddlewareResolver implements IHttpMiddlewareResolver {
  private readonly _registry: HttpMiddlewareRegistry;

  constructor(registry: HttpMiddlewareRegistry) {
    this._registry = registry;
  }

  public get registry(): HttpMiddlewareRegistry {
    return this._registry;
  }

  public resolveEntries(): readonly RegisteredMiddlewareEntry[] {
    const entries = this._registry.listEntries().filter((e) => e.enabled);

    const sorted = [...entries].sort((a, b) => {
      // 1. Priority DESC
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 2. Sequence ASC (earlier registered first)
      return a.sequence - b.sequence;
    });

    return Object.freeze(sorted);
  }

  public resolve(): readonly HttpMiddleware[] {
    const sortedEntries = this.resolveEntries();
    return Object.freeze(sortedEntries.map((e) => e.middleware));
  }
}
