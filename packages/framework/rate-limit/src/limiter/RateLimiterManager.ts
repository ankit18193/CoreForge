import {
  RateLimitDiagnosticsSnapshot,
  RateLimitPolicy,
  RateLimitProvider,
  RateLimiter,
  RateLimiterManager as IRateLimiterManager,
} from '@coreforge/contracts';

import { RateLimiterInstance } from './RateLimiterInstance';
import { RateLimitDiagnostics } from '../diagnostics/RateLimitDiagnostics';
import { RateLimitLifecycleManager } from '../lifecycle/RateLimitLifecycleManager';
import { MemoryRateLimitProvider } from '../provider/MemoryRateLimitProvider';
import { RateLimiterOptions, RateLimitState } from '../types/rateLimitTypes';

export class RateLimiterManager implements IRateLimiterManager {
  private readonly _provider: RateLimitProvider;
  private readonly _lifecycle: RateLimitLifecycleManager;
  private readonly _diagnostics: RateLimitDiagnostics;
  private readonly _defaultCost?: number | undefined;

  constructor(options: RateLimiterOptions = {}, provider?: RateLimitProvider) {
    this._provider = provider ?? new MemoryRateLimitProvider();
    this._lifecycle = new RateLimitLifecycleManager();
    this._diagnostics = new RateLimitDiagnostics();
    this._defaultCost = options.defaultCost;

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this._lifecycle.start();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): RateLimitState {
    return this._lifecycle.state;
  }

  public get provider(): RateLimitProvider {
    return this._provider;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._lifecycle.transitionToStopped();

    if (
      'clear' in this._provider &&
      typeof (this._provider as { clear: () => Promise<void> }).clear === 'function'
    ) {
      try {
        await (this._provider as { clear: () => Promise<void> }).clear();
      } catch {
        // safe cleanup
      }
    }
  }

  public limiter(policy: RateLimitPolicy): RateLimiter {
    return new RateLimiterInstance(
      policy,
      this._provider,
      this._lifecycle,
      this._diagnostics,
      undefined,
      this._defaultCost,
    );
  }

  public getDiagnostics(): RateLimitDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
