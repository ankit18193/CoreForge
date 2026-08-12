import { SecurityContext } from '@coreforge/contracts';

export interface SecurityAuthorizationPolicy {
  readonly name: string;
  authorize(context: SecurityContext): Promise<boolean>;
}
