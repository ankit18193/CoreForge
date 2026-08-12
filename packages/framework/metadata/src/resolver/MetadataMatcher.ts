import { MetadataQuery } from './MetadataQuery';
import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';

export class MetadataMatcher {
  public matches(
    descriptor: MetadataDescriptor,
    query: MetadataQuery,
    lookupById: (id: string) => MetadataDescriptor | undefined,
  ): boolean {
    if (query.type !== undefined && descriptor.type !== query.type) {
      return false;
    }
    if (query.parentId !== undefined && descriptor.parentId !== query.parentId) {
      return false;
    }

    if (query.module !== undefined) {
      if (!this._hasAncestor(descriptor, query.module, lookupById)) {
        return false;
      }
    }
    if (query.controller !== undefined) {
      if (!this._hasAncestor(descriptor, query.controller, lookupById)) {
        return false;
      }
    }
    if (query.action !== undefined) {
      if (!this._hasAncestor(descriptor, query.action, lookupById)) {
        return false;
      }
    }

    if (query.predicate !== undefined && !query.predicate(descriptor)) {
      return false;
    }
    return true;
  }

  private _hasAncestor(
    descriptor: MetadataDescriptor,
    targetId: string,
    lookupById: (id: string) => MetadataDescriptor | undefined,
  ): boolean {
    let current: MetadataDescriptor | undefined = descriptor;
    while (current) {
      if (current.parentId === targetId) {
        return true;
      }
      current = current.parentId ? lookupById(current.parentId) : undefined;
    }
    return false;
  }
}
