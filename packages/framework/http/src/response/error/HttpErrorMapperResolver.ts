import { HttpErrorMapper } from '@coreforge/contracts';

import { HttpErrorMapperRegistry } from './HttpErrorMapperRegistry';
import { HttpErrorMapperNotFoundError } from '../../errors/HttpErrorMappingErrors';
import { HttpErrorMapperEntry } from '../../types/httpErrorTypes';

export interface HttpErrorResolverOptions {
  readonly mapperId?: string | undefined;
  readonly throwOnNotFound?: boolean | undefined;
}

export class HttpErrorMapperResolver {
  private readonly _registry: HttpErrorMapperRegistry;
  private readonly _fallbackMapper?: HttpErrorMapper | undefined;

  constructor(registry?: HttpErrorMapperRegistry, fallbackMapper?: HttpErrorMapper) {
    this._registry = registry ?? new HttpErrorMapperRegistry();
    this._fallbackMapper = fallbackMapper;
  }

  public get registry(): HttpErrorMapperRegistry {
    return this._registry;
  }

  public get fallbackMapper(): HttpErrorMapper | undefined {
    return this._fallbackMapper;
  }

  public resolve(
    error: unknown,
    options: HttpErrorResolverOptions = {},
  ): HttpErrorMapper | undefined {
    const entries = this._registry.list();

    // 1. Explicit mapper ID match
    if (options.mapperId) {
      const entry = this._registry.get(options.mapperId);
      if (entry) {
        return entry.mapper;
      }
    }

    if (error && (typeof error === 'object' || typeof error === 'function')) {
      const errObj = error as Record<string, unknown>;
      const code = typeof errObj.code === 'string' ? errObj.code : undefined;

      // 2. Explicit error type / constructor match
      const typeMatches = entries.filter((e) => {
        if (typeof e.errorType === 'function') {
          return error instanceof e.errorType;
        }
        return false;
      });

      if (typeMatches.length > 0) {
        return this._sortEntries(typeMatches)[0].mapper;
      }

      // 3. Explicit error code match
      if (code) {
        const codeMatches = entries.filter((e) => e.code !== undefined && e.code === code);
        if (codeMatches.length > 0) {
          return this._sortEntries(codeMatches)[0].mapper;
        }
      }

      // 4. Custom predicate match
      const predicateMatches = entries.filter((e) => {
        if (typeof e.predicate === 'function') {
          try {
            return e.predicate(error);
          } catch {
            return false;
          }
        }
        return false;
      });

      if (predicateMatches.length > 0) {
        return this._sortEntries(predicateMatches)[0].mapper;
      }

      // 5. canMap method on mapper
      const canMapMatches = entries.filter((e) => {
        if (typeof e.mapper.canMap === 'function') {
          try {
            return e.mapper.canMap(error);
          } catch {
            return false;
          }
        }
        return false;
      });

      if (canMapMatches.length > 0) {
        return this._sortEntries(canMapMatches)[0].mapper;
      }
    }

    // 6. Fallback mapper
    if (this._fallbackMapper) {
      return this._fallbackMapper;
    }

    if (options.throwOnNotFound) {
      const errName =
        error && typeof error === 'object' && 'name' in error
          ? String((error as { name?: unknown }).name)
          : 'UnknownError';
      throw new HttpErrorMapperNotFoundError(errName);
    }

    return undefined;
  }

  private _sortEntries(entries: readonly HttpErrorMapperEntry[]): HttpErrorMapperEntry[] {
    return [...entries].sort((a, b) => {
      // Primary: Priority DESC
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Secondary: Registration Sequence ASC (FIFO deterministic tie-breaker)
      return a.sequence - b.sequence;
    });
  }
}
