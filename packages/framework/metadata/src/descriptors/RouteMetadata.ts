import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class RouteMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.ROUTE;
  public readonly parentId?: string | undefined;
  public readonly path: string;
  public readonly method: string;

  constructor(params: { id: string; parentId?: string | undefined; path: string; method: string }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.path = params.path;
    this.method = params.method;
    Object.freeze(this);
  }
}
