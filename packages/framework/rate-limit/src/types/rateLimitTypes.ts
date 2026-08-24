import {
  RateLimitAlgorithm,
  RateLimitConsumeOptions,
  RateLimitDecision,
  RateLimitDiagnosticsSnapshot,
  RateLimitPolicy,
  RateLimitProvider,
  RateLimiter,
  RateLimiterManager as IRateLimiterManager,
} from '@coreforge/contracts';

export type {
  RateLimitAlgorithm,
  RateLimitConsumeOptions,
  RateLimitDecision,
  RateLimitDiagnosticsSnapshot,
  RateLimitPolicy,
  RateLimitProvider,
  RateLimiter,
  IRateLimiterManager,
};

export type RateLimitState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface RateLimiterOptions {
  readonly defaultCost?: number | undefined;
  readonly autoStart?: boolean | undefined;
}
