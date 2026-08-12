import { RequestScope } from '@coreforge/contracts';

import { ScopeMetadata } from '../metadata/ScopeMetadata';

export interface ScopeDescriptor {
  readonly id: string;
  readonly scope: RequestScope;
  readonly metadata: ScopeMetadata;
}
