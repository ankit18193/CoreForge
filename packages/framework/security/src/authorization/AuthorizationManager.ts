import { SecurityContext } from '@coreforge/contracts';

import { AuthorizationRegistry } from './AuthorizationRegistry';
import { AuthorizationResult } from './AuthorizationResult';
import { SecurityStatistics } from '../diagnostics/SecurityStatistics';

export class AuthorizationManager {
  private readonly _registry: AuthorizationRegistry;
  private readonly _stats: SecurityStatistics;

  constructor(registry: AuthorizationRegistry, stats: SecurityStatistics) {
    this._registry = registry;
    this._stats = stats;
  }

  public async authorize(
    context: SecurityContext,
    policyNames: readonly string[],
  ): Promise<AuthorizationResult> {
    const failingPolicies: string[] = [];

    for (const name of policyNames) {
      const policy = this._registry.get(name);
      this._stats.recordPolicyUsage(name);
      if (!policy) {
        failingPolicies.push(name);
        this._stats.recordAuthorizationAttempt(false);
        continue;
      }

      const policyStart = Date.now();
      try {
        const allowed = await policy.authorize(context);
        this._stats.recordPolicyDuration(Date.now() - policyStart);

        if (!allowed) {
          failingPolicies.push(name);
          this._stats.recordAuthorizationAttempt(false);
        } else {
          this._stats.recordAuthorizationAttempt(true);
        }
      } catch {
        failingPolicies.push(name);
        this._stats.recordAuthorizationAttempt(false);
      }
    }

    if (failingPolicies.length > 0) {
      return AuthorizationResult.failedResult(failingPolicies);
    }
    return AuthorizationResult.successResult();
  }
}
