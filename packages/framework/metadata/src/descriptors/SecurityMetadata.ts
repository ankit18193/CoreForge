import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class SecurityMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.SECURITY;
  public readonly parentId?: string | undefined;
  public readonly roles: readonly string[];
  public readonly policies: readonly string[];

  constructor(params: {
    id: string;
    parentId?: string | undefined;
    roles?: readonly string[] | undefined;
    policies?: readonly string[] | undefined;
  }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.roles = params.roles || [];
    this.policies = params.policies || [];
    Object.freeze(this);
  }
}
