import {
  RateLimitConsumeOptions,
  RateLimitDecision,
  RateLimitPolicy,
  RateLimitProvider,
  RateLimiter,
} from '@coreforge/contracts';

import { RateLimitDiagnostics } from '../diagnostics/RateLimitDiagnostics';
import { RateLimitProfiler } from '../internal/RateLimitProfiler';
import { RateLimitKey } from '../key/RateLimitKey';
import { RateLimitNamespace } from '../key/RateLimitNamespace';
import { RateLimitLifecycleManager } from '../lifecycle/RateLimitLifecycleManager';
import { RateLimitPolicyValidator } from '../policy/RateLimitPolicyValidator';

export class RateLimiterInstance implements RateLimiter {
  private readonly _policy: RateLimitPolicy;
  private readonly _provider: RateLimitProvider;
  private readonly _lifecycle: RateLimitLifecycleManager;
  private readonly _diagnostics: RateLimitDiagnostics;
  private readonly _namespacePrefix?: string | undefined;
  private readonly _defaultCost?: number | undefined;

  constructor(
    policy: RateLimitPolicy,
    provider: RateLimitProvider,
    lifecycle: RateLimitLifecycleManager,
    diagnostics: RateLimitDiagnostics,
    namespacePrefix?: string,
    defaultCost?: number,
  ) {
    this._policy = RateLimitPolicyValidator.validatePolicy(policy);
    this._provider = provider;
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._namespacePrefix = namespacePrefix;
    this._defaultCost = defaultCost;
  }

  public get policy(): RateLimitPolicy {
    return this._policy;
  }

  public get namespacePrefix(): string | undefined {
    return this._namespacePrefix;
  }

  public async check(key: string, options?: RateLimitConsumeOptions): Promise<RateLimitDecision> {
    this._lifecycle.ensureOperational();
    const resolvedKey = this._resolveKey(key);
    const cost = RateLimitPolicyValidator.validateCost(options?.cost ?? this._defaultCost);

    const profiler = new RateLimitProfiler().start();
    const customProvider = this._provider as {
      consume: (
        k: string,
        p: RateLimitPolicy,
        c: number,
        dryRun?: boolean,
      ) => Promise<RateLimitDecision>;
    };
    const decision = await customProvider.consume(resolvedKey, this._policy, cost, true);

    this._diagnostics.recordDecision(decision.allowed, cost, profiler.elapsedMs, true);
    return decision;
  }

  public async consume(key: string, options?: RateLimitConsumeOptions): Promise<RateLimitDecision> {
    this._lifecycle.ensureOperational();
    const resolvedKey = this._resolveKey(key);
    const cost = RateLimitPolicyValidator.validateCost(options?.cost ?? this._defaultCost);

    const profiler = new RateLimitProfiler().start();
    const decision = await this._provider.consume(resolvedKey, this._policy, cost);

    this._diagnostics.recordDecision(decision.allowed, cost, profiler.elapsedMs, false);
    return decision;
  }

  public async reset(key: string): Promise<void> {
    this._lifecycle.ensureOperational();
    const resolvedKey = this._resolveKey(key);
    await this._provider.reset(resolvedKey);
  }

  public namespace(name: string): RateLimiter {
    const validNs = RateLimitNamespace.validate(name);
    const composedNs = this._namespacePrefix ? `${this._namespacePrefix}:${validNs}` : validNs;

    return new RateLimiterInstance(
      this._policy,
      this._provider,
      this._lifecycle,
      this._diagnostics,
      composedNs,
      this._defaultCost,
    );
  }

  private _resolveKey(key: string): string {
    const validKey = RateLimitKey.validate(key);
    return this._namespacePrefix ? `${this._namespacePrefix}:${validKey}` : validKey;
  }
}
