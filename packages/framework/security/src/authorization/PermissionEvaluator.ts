import { SecurityContext } from '@coreforge/contracts';

import { SecurityAuthorizationPolicy } from './AuthorizationPolicy';

export class PermissionEvaluator {
  public async evaluate(
    context: SecurityContext,
    requirements: {
      role?: string;
      permission?: string;
      claim?: { name: string; value: unknown };
      policy?: SecurityAuthorizationPolicy;
    },
  ): Promise<boolean> {
    const principal = context.principal;
    if (!principal) {
      return false;
    }

    if (requirements.role) {
      if (!principal.roles.includes(requirements.role)) {
        return false;
      }
    }

    if (requirements.permission) {
      const permissions = principal.claims['permissions'];
      if (Array.isArray(permissions)) {
        if (!permissions.includes(requirements.permission)) {
          return false;
        }
      } else {
        return false;
      }
    }

    if (requirements.claim) {
      const claimVal = principal.claims[requirements.claim.name];
      if (claimVal !== requirements.claim.value) {
        return false;
      }
    }

    if (requirements.policy) {
      const allowed = await requirements.policy.authorize(context);
      if (!allowed) {
        return false;
      }
    }

    return true;
  }
}
