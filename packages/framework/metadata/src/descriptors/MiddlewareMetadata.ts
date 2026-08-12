import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class MiddlewareMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.MIDDLEWARE;
  public readonly parentId?: string | undefined;
  public readonly middlewareName: string;
  public readonly priority: number;

  constructor(params: {
    id: string;
    parentId?: string | undefined;
    middlewareName: string;
    priority?: number | undefined;
  }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.middlewareName = params.middlewareName;
    this.priority = params.priority || 100;
    Object.freeze(this);
  }
}
