import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class InterceptorMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.INTERCEPTOR;
  public readonly parentId?: string | undefined;
  public readonly interceptorName: string;
  public readonly priority: number;

  constructor(params: {
    id: string;
    parentId?: string | undefined;
    interceptorName: string;
    priority?: number | undefined;
  }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.interceptorName = params.interceptorName;
    this.priority = params.priority || 100;
    Object.freeze(this);
  }
}
