import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';

export interface MetadataQuery {
  readonly type?: MetadataType | undefined;
  readonly parentId?: string | undefined;
  readonly module?: string | undefined;
  readonly controller?: string | undefined;
  readonly action?: string | undefined;
  readonly predicate?: ((desc: MetadataDescriptor) => boolean) | undefined;
}
