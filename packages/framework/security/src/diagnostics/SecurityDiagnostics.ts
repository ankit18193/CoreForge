import { SecurityStatistics } from './SecurityStatistics';

export interface SecurityDiagnosticsSnapshot {
  readonly authAttempts: number;
  readonly authSuccesses: number;
  readonly authFailures: number;
  readonly deniedRequests: number;
  readonly anonymousRequests: number;
  readonly averagePolicyDurationMs: number;
  readonly providerUsage: Readonly<Record<string, number>>;
  readonly policyUsage: Readonly<Record<string, number>>;
}

export class SecurityDiagnostics {
  private readonly _stats: SecurityStatistics;

  constructor(stats: SecurityStatistics) {
    this._stats = stats;
  }

  public getSnapshot(): SecurityDiagnosticsSnapshot {
    const providers: Record<string, number> = {};
    for (const [k, v] of this._stats.providerUsage.entries()) {
      providers[k] = v;
    }

    const policies: Record<string, number> = {};
    for (const [k, v] of this._stats.policyUsage.entries()) {
      policies[k] = v;
    }

    return {
      authAttempts: this._stats.authAttempts,
      authSuccesses: this._stats.authSuccesses,
      authFailures: this._stats.authFailures,
      deniedRequests: this._stats.deniedRequests,
      anonymousRequests: this._stats.anonymousRequests,
      averagePolicyDurationMs: this._stats.averagePolicyDurationMs,
      providerUsage: Object.freeze(providers),
      policyUsage: Object.freeze(policies),
    };
  }
}
