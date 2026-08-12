import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class ParameterMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.PARAMETER;
  public readonly parentId?: string | undefined;
  public readonly name: string;
  public readonly index: number;
  public readonly paramType: string;

  constructor(params: {
    id: string;
    parentId?: string | undefined;
    name: string;
    index: number;
    paramType: string;
  }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.name = params.name;
    this.index = params.index;
    this.paramType = params.paramType;
    Object.freeze(this);
  }
}
