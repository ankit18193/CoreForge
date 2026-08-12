import { MetadataDescriptor as IMetadataDescriptor } from '@coreforge/contracts';

export interface MetadataDescriptor extends IMetadataDescriptor {
  readonly parentId?: string | undefined;
}
