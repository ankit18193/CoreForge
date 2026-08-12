import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from './MetadataDescriptor';

export class ProviderMetadata implements MetadataDescriptor {
  public readonly id: string;
  public readonly type = MetadataType.PROVIDER;
  public readonly parentId?: string | undefined;
  public readonly serviceToken: string;
  public readonly scope: 'SINGLETON' | 'TRANSIENT' | 'SCOPED';

  constructor(params: {
    id: string;
    parentId?: string | undefined;
    serviceToken: string;
    scope?: 'SINGLETON' | 'TRANSIENT' | 'SCOPED' | undefined;
  }) {
    this.id = params.id;
    this.parentId = params.parentId;
    this.serviceToken = params.serviceToken;
    this.scope = params.scope || 'SINGLETON';
    Object.freeze(this);
  }
}
