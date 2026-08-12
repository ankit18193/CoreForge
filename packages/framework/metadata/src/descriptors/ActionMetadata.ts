import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class ActionMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.ACTION;
  public readonly parentId?: string | undefined;
  public readonly name: string;

  constructor(params: { id: string; parentId?: string | undefined; name: string }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.name = params.name;
    Object.freeze(this);
  }
}
