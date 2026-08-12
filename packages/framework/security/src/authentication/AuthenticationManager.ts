import { SecurityContext } from '@coreforge/contracts';


import { AuthenticationRegistry } from './AuthenticationRegistry';
import { AuthenticationResult } from './AuthenticationResult';
import { Identity } from './Identity';
import { IdentityFactory } from './IdentityFactory';
import { Principal } from '../context/Principal';
import { SecurityStatistics } from '../diagnostics/SecurityStatistics';

export class AuthenticationManager {
  private readonly _registry: AuthenticationRegistry;
  private readonly _identityFactory = new IdentityFactory();
  private readonly _stats: SecurityStatistics;

  constructor(registry: AuthenticationRegistry, stats: SecurityStatistics) {
    this._registry = registry;
    this._stats = stats;
  }

  public async authenticate(
    context: SecurityContext,
    mutateContext: (
      principal: Principal | undefined,
      identity: Identity | undefined,
      result: AuthenticationResult,
      provider: string,
    ) => void,
  ): Promise<AuthenticationResult> {
    const providers = this._registry.getProviders();

    for (const provider of providers) {
      this._stats.recordProviderUsage(provider.name);
      try {
        const identity = await provider.authenticate(context);
        if (identity) {
          const principal = this._identityFactory.createPrincipal(identity);
          const result = AuthenticationResult.successResult(principal, identity, provider.name);
          mutateContext(principal, identity, result, provider.name);
          this._stats.recordAuthenticationAttempt(true);
          return result;
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const result = AuthenticationResult.failedResult(error, provider.name);
        mutateContext(undefined, undefined, result, provider.name);
        this._stats.recordAuthenticationAttempt(false);
        return result;
      }
    }

    const anonymousPrincipal = this._identityFactory.createAnonymousPrincipal();
    const result = AuthenticationResult.anonymousResult();
    mutateContext(anonymousPrincipal, undefined, result, 'anonymous');
    this._stats.recordAnonymousRequest();
    return result;
  }
}
