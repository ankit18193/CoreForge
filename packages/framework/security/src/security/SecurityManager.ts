import {
  SecurityContext as ISecurityContext,
  SecurityManager as ISecurityManager,
} from '@coreforge/contracts';

import { SecurityConfiguration } from './SecurityConfiguration';
import { AuthenticationManager } from '../authentication/AuthenticationManager';
import { AuthorizationManager } from '../authorization/AuthorizationManager';
import { SecurityContext } from '../context/SecurityContext';
import { SecurityDiagnostics } from '../diagnostics/SecurityDiagnostics';
import { SecurityStatistics } from '../diagnostics/SecurityStatistics';
import { SecurityProfiler } from '../internal/SecurityProfiler';
import { SecurityLifecycleManager } from '../lifecycle/SecurityLifecycleManager';
import { SecurityState } from '../lifecycle/SecurityState';
import { SecurityPipeline } from '../pipeline/SecurityPipeline';

export class SecurityManager implements ISecurityManager {
  private readonly _config: SecurityConfiguration;
  private readonly _lifecycle = new SecurityLifecycleManager();

  private readonly _stats = new SecurityStatistics();
  private readonly _diagnostics = new SecurityDiagnostics(this._stats);

  private readonly _authNManager: AuthenticationManager;
  private readonly _authZManager: AuthorizationManager;
  private readonly _pipeline: SecurityPipeline;

  constructor(config: SecurityConfiguration) {
    this._config = config;
    this._authNManager = new AuthenticationManager(config.registry.authentication, this._stats);
    this._authZManager = new AuthorizationManager(config.registry.authorization, this._stats);
    this._pipeline = new SecurityPipeline(this._authNManager, this._authZManager);

    this._lifecycle.transitionTo(SecurityState.INITIALIZED);
    this._lifecycle.transitionTo(SecurityState.READY);
  }

  public get state(): SecurityState {
    return this._lifecycle.state;
  }

  public get configuration(): SecurityConfiguration {
    return this._config;
  }

  public get diagnostics(): SecurityDiagnostics {
    return this._diagnostics;
  }

  public stop(): void {
    if (this._lifecycle.state === SecurityState.STOPPED) {
      return;
    }
    this._lifecycle.transitionTo(SecurityState.STOPPED);
  }

  public start(): void {
    if (this._lifecycle.state === SecurityState.READY) {
      return;
    }
    this._lifecycle.transitionTo(SecurityState.READY);
  }

  public async authenticate(context: ISecurityContext): Promise<void> {
    if (this._lifecycle.state !== SecurityState.READY) {
      throw new Error(`SecurityManager is not in READY state (current: ${this._lifecycle.state}).`);
    }

    if (!(context instanceof SecurityContext)) {
      throw new Error('SecurityManager: expected SecurityContext instance.');
    }

    try {
      await this._authNManager.authenticate(context, (principal, identity, result) => {
        context.setPrincipal(principal);
        context.setIdentity(identity);
        context.setAuthenticationResult(result);
      });
    } catch (err: unknown) {
      this._lifecycle.transitionTo(SecurityState.FAILED);
      throw err;
    }
  }

  public async authorize(context: ISecurityContext): Promise<void> {
    await this.authorizeWithPolicies(context, []);
  }

  public async authorizeWithPolicies(
    context: ISecurityContext,
    policyNames: readonly string[],
  ): Promise<void> {
    if (this._lifecycle.state !== SecurityState.READY) {
      throw new Error(`SecurityManager is not in READY state (current: ${this._lifecycle.state}).`);
    }

    if (!(context instanceof SecurityContext)) {
      throw new Error('SecurityManager: expected SecurityContext instance.');
    }

    try {
      const res = await this._authZManager.authorize(context, policyNames);
      context.setAuthorizationResult(res);
      if (!res.success) {
        throw new Error(`Access denied. Failing policies: ${res.failingPolicies.join(', ')}`);
      }
    } catch (err: unknown) {
      this._lifecycle.transitionTo(SecurityState.FAILED);
      throw err;
    }
  }

  public async executePipeline(
    context: SecurityContext,
    policyNames: readonly string[],
  ): Promise<void> {
    if (this._lifecycle.state !== SecurityState.READY) {
      throw new Error(`SecurityManager is not in READY state (current: ${this._lifecycle.state}).`);
    }

    const profiler = new SecurityProfiler();
    const start = Date.now();
    try {
      await this._pipeline.execute(context, policyNames, profiler);
      profiler.recordTotal(Date.now() - start);
    } catch (err: unknown) {
      this._lifecycle.transitionTo(SecurityState.FAILED);
      throw err;
    }
  }
}
