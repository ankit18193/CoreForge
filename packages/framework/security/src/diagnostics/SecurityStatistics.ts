export class SecurityStatistics {
  private _authAttempts = 0;
  private _authSuccesses = 0;
  private _authFailures = 0;
  private _deniedRequests = 0;
  private _anonymousRequests = 0;

  private _policyAttempts = 0;
  private _policyDuration = 0;

  private readonly _providerUsage = new Map<string, number>();
  private readonly _policyUsage = new Map<string, number>();

  public recordAuthenticationAttempt(success: boolean): void {
    this._authAttempts++;
    if (success) {
      this._authSuccesses++;
    } else {
      this._authFailures++;
    }
  }

  public recordAuthorizationAttempt(success: boolean): void {
    if (!success) {
      this._deniedRequests++;
    }
  }

  public recordAnonymousRequest(): void {
    this._anonymousRequests++;
  }

  public recordProviderUsage(providerName: string): void {
    this._providerUsage.set(providerName, (this._providerUsage.get(providerName) || 0) + 1);
  }

  public recordPolicyUsage(policyName: string): void {
    this._policyUsage.set(policyName, (this._policyUsage.get(policyName) || 0) + 1);
  }

  public recordPolicyDuration(durationMs: number): void {
    this._policyAttempts++;
    this._policyDuration += durationMs;
  }

  public get authAttempts(): number {
    return this._authAttempts;
  }

  public get authSuccesses(): number {
    return this._authSuccesses;
  }

  public get authFailures(): number {
    return this._authFailures;
  }

  public get deniedRequests(): number {
    return this._deniedRequests;
  }

  public get anonymousRequests(): number {
    return this._anonymousRequests;
  }

  public get averagePolicyDurationMs(): number {
    return this._policyAttempts > 0 ? this._policyDuration / this._policyAttempts : 0;
  }

  public get providerUsage(): ReadonlyMap<string, number> {
    return this._providerUsage;
  }

  public get policyUsage(): ReadonlyMap<string, number> {
    return this._policyUsage;
  }
}
