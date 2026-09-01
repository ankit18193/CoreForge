import type { HttpSerializer } from '@coreforge/contracts';

import { HttpSerializerRegistry } from './HttpSerializerRegistry';
import { HttpSerializerNotFoundError } from '../errors/HttpSerializationErrors';
import { RegisteredSerializerEntry } from '../types/httpResponseTypes';

export class HttpSerializerResolver {
  private readonly _registry: HttpSerializerRegistry;

  constructor(registry?: HttpSerializerRegistry) {
    this._registry = registry ?? new HttpSerializerRegistry();
  }

  public get registry(): HttpSerializerRegistry {
    return this._registry;
  }

  /**
   * Deterministically resolve a serializer based on explicit ID or media type.
   * Order of precedence:
   * 1. Explicit serializer ID
   * 2. Content / Media type compatibility
   * 3. Priority DESC -> Registration Sequence ASC
   */
  public resolve(
    identifierOrMediaType?: string,
    options: { readonly throwOnNotFound?: boolean } = {},
  ): HttpSerializer | undefined {
    const entries = this._registry.listEntries().filter((e) => e.enabled);

    if (entries.length === 0) {
      if (options.throwOnNotFound) {
        throw new HttpSerializerNotFoundError(identifierOrMediaType ?? 'default');
      }
      return undefined;
    }

    // 1. Check for explicit Serializer ID
    if (identifierOrMediaType) {
      const trimmed = identifierOrMediaType.trim();
      const byId = this._registry.getEntry(trimmed);
      if (byId && byId.enabled) {
        return byId.serializer;
      }

      // 2. Check for Media Type compatibility (e.g. "application/json" or "text/plain")
      const normalizedMediaType = trimmed.toLowerCase().split(';')[0].trim();
      if (normalizedMediaType && normalizedMediaType !== '*/*') {
        const matchingEntries = entries.filter((e) =>
          e.mediaTypes.some((mt) => mt === normalizedMediaType || mt === '*/*'),
        );

        if (matchingEntries.length > 0) {
          return this._sortEntries(matchingEntries)[0].serializer;
        }
      }
    }

    // 3. Fallback: resolve default serializer by priority DESC, sequence ASC
    const sorted = this._sortEntries(entries);
    const resolved = sorted[0]?.serializer;

    if (!resolved && options.throwOnNotFound) {
      throw new HttpSerializerNotFoundError(identifierOrMediaType ?? 'default');
    }

    return resolved;
  }

  private _sortEntries(entries: readonly RegisteredSerializerEntry[]): RegisteredSerializerEntry[] {
    return [...entries].sort((a, b) => {
      // Primary: Priority DESC
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Secondary: Registration sequence ASC (deterministic FIFO)
      return a.sequence - b.sequence;
    });
  }
}
