import { MetadataType } from '@coreforge/contracts';

import { MetadataCursor } from './MetadataCursor';
import { MetadataMatcher } from './MetadataMatcher';
import { MetadataQuery } from './MetadataQuery';
import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';
import { MetadataDiagnostics } from '../diagnostics/MetadataDiagnostics';
import { MetadataIndex } from '../metadata/MetadataIndex';

export class MetadataResolver {
  private readonly _index: MetadataIndex;
  private readonly _diagnostics: MetadataDiagnostics;
  private readonly _matcher = new MetadataMatcher();
  private readonly _cache = new Map<string, readonly MetadataDescriptor[]>();

  constructor(index: MetadataIndex, diagnostics: MetadataDiagnostics) {
    this._index = index;
    this._diagnostics = diagnostics;
  }

  public query(query: MetadataQuery): readonly MetadataDescriptor[] {
    const cacheKey = this._buildCacheKey(query);
    const cached = this._cache.get(cacheKey);
    if (cached) {
      this._diagnostics.recordCacheHit();
      return cached;
    }

    this._diagnostics.recordCacheMiss();

    let candidates: readonly MetadataDescriptor[] = [];
    if (query.type !== undefined) {
      candidates = this._index.getByType(query.type);
    } else if (query.parentId !== undefined) {
      candidates = this._index.getByParent(query.parentId);
    } else {
      const typesList = [
        MetadataType.MODULE,
        MetadataType.CONTROLLER,
        MetadataType.ACTION,
        MetadataType.ROUTE,
        MetadataType.PARAMETER,
        MetadataType.PROVIDER,
        MetadataType.MIDDLEWARE,
        MetadataType.INTERCEPTOR,
        MetadataType.SECURITY,
      ];
      const combined: MetadataDescriptor[] = [];
      for (const t of typesList) {
        combined.push(...this._index.getByType(t));
      }
      candidates = combined;
    }

    const matched = candidates.filter((c) =>
      this._matcher.matches(c, query, (id) => this._index.getById(id)),
    );

    this._cache.set(cacheKey, matched);
    return matched;
  }

  public queryCursor(query: MetadataQuery): MetadataCursor {
    const results = this.query(query);
    return new MetadataCursor(results);
  }

  public clearCache(): void {
    this._cache.clear();
  }

  private _buildCacheKey(query: MetadataQuery): string {
    const parts: string[] = [];
    if (query.type !== undefined) {
      parts.push(`t:${query.type}`);
    }
    if (query.parentId !== undefined) {
      parts.push(`p:${query.parentId}`);
    }
    if (query.module !== undefined) {
      parts.push(`m:${query.module}`);
    }
    if (query.controller !== undefined) {
      parts.push(`c:${query.controller}`);
    }
    if (query.action !== undefined) {
      parts.push(`a:${query.action}`);
    }
    if (query.predicate !== undefined) {
      parts.push(`pr:${query.predicate.toString()}`);
    }
    return parts.join('|') || 'all';
  }
}
