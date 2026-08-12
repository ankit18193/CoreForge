import { SecurityExecutionContext } from './SecurityExecutionContext';
import { SecurityStage } from './SecurityStage';
import { AuthenticationManager } from '../authentication/AuthenticationManager';
import { AuthorizationManager } from '../authorization/AuthorizationManager';
import { SecurityContext } from '../context/SecurityContext';
import { ForbiddenError } from '../errors/SecurityErrors';
import { SecurityProfiler } from '../internal/SecurityProfiler';

export class SecurityPipeline {
  private readonly _authNManager: AuthenticationManager;
  private readonly _authZManager: AuthorizationManager;

  constructor(authNManager: AuthenticationManager, authZManager: AuthorizationManager) {
    this._authNManager = authNManager;
    this._authZManager = authZManager;
  }

  public async execute(
    context: SecurityContext,
    policyNames: readonly string[],
    profiler?: SecurityProfiler,
  ): Promise<void> {
    const execContext = new SecurityExecutionContext(context);

    execContext.setStage(SecurityStage.AUTHENTICATION);
    const authNStart = Date.now();

    await this._authNManager.authenticate(context, (principal, identity, result) => {
      context.setPrincipal(principal);
      context.setIdentity(identity);
      context.setAuthenticationResult(result);
    });

    profiler?.recordAuthentication(Date.now() - authNStart);

    execContext.setStage(SecurityStage.IDENTITY_VALIDATION);

    execContext.setStage(SecurityStage.AUTHORIZATION);
    const authZStart = Date.now();

    const authZResult = await this._authZManager.authorize(context, policyNames);
    context.setAuthorizationResult(authZResult);

    profiler?.recordAuthorization(Date.now() - authZStart);

    execContext.setStage(SecurityStage.POLICY_EVALUATION);
    if (!authZResult.success) {
      execContext.setStage(SecurityStage.FAILED);
      throw new ForbiddenError(
        `Access denied. Failing policies: ${authZResult.failingPolicies.join(', ')}`,
        { failingPolicies: [...authZResult.failingPolicies] },
      );
    }

    execContext.setStage(SecurityStage.COMPLETED);
  }
}
