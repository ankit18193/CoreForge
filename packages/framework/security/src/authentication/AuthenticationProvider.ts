import { SecurityContext } from '@coreforge/contracts';

import { Identity } from './Identity';

export interface SecurityAuthenticationProvider {
  readonly name: string;
  authenticate(context: SecurityContext): Promise<Identity | undefined>;
}
