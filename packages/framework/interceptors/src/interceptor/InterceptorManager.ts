import {
  InterceptionResult as IInterceptionResult,
  InterceptorContext,
  InterceptorManager as IInterceptorManager,
  NextInvocation,
} from '@coreforge/contracts';

import { InterceptorConfiguration } from './InterceptorConfiguration';
import { InterceptorDiagnostics } from '../diagnostics/InterceptorDiagnostics';
import { InterceptorStatistics } from '../diagnostics/InterceptorStatistics';
import { InterceptorProfiler } from '../internal/InterceptorProfiler';
import { InterceptorLifecycleManager } from '../lifecycle/InterceptorLifecycleManager';
import { InterceptorState } from '../lifecycle/InterceptorState';
import { InterceptorPipeline } from '../pipeline/InterceptorPipeline';
import { InterceptorRegistryManager } from '../registry/InterceptorRegistryManager';

export class InterceptorManager implements IInterceptorManager {
  private readonly _config: InterceptorConfiguration;
  private readonly _lifecycle = new InterceptorLifecycleManager();

  private readonly _stats = new InterceptorStatistics();
  private readonly _diagnostics = new InterceptorDiagnostics(this._stats);

  private readonly _registryManager: InterceptorRegistryManager;
  private readonly _pipeline = new InterceptorPipeline();

  constructor(config: InterceptorConfiguration) {
    this._config = config;
    this._registryManager = new InterceptorRegistryManager(config.registry);

    this._lifecycle.transitionTo(InterceptorState.INITIALIZED);
    this._lifecycle.transitionTo(InterceptorState.READY);
  }

  public get state(): InterceptorState {
    return this._lifecycle.state;
  }

  public get configuration(): InterceptorConfiguration {
    return this._config;
  }

  public get diagnostics(): InterceptorDiagnostics {
    return this._diagnostics;
  }

  public stop(): void {
    if (this._lifecycle.state === InterceptorState.STOPPED) {
      return;
    }
    this._lifecycle.transitionTo(InterceptorState.STOPPED);
  }

  public start(): void {
    if (this._lifecycle.state === InterceptorState.READY) {
      return;
    }
    this._lifecycle.transitionTo(InterceptorState.READY);
  }

  public async execute(
    context: InterceptorContext,
    next: NextInvocation,
  ): Promise<IInterceptionResult> {
    if (this._lifecycle.state !== InterceptorState.READY) {
      throw new Error(
        `InterceptorManager is not in READY state (current: ${this._lifecycle.state}).`,
      );
    }

    const profiler = new InterceptorProfiler();
    const start = Date.now();

    this._stats.recordInterception();

    try {
      const sorted = this._registryManager.getSortedDescriptors();
      const interceptors = sorted.map((d) => d.interceptor);

      let proceedCalled = false;

      const res = await this._pipeline.execute(
        context,
        interceptors,
        async () => {
          proceedCalled = true;
          return next.proceed();
        },
        (name, phase, durationMs) => {
          if (phase === 'before') {
            this._stats.recordBeforeDuration(durationMs);
          } else {
            this._stats.recordAfterDuration(durationMs);
            this._stats.recordExecution(name, durationMs);
          }
        },
        profiler,
      );

      if (!proceedCalled) {
        this._stats.recordShortCircuit();
      }

      profiler.recordTotal(Date.now() - start);

      return res;
    } catch (err: unknown) {
      this._stats.recordException();
      this._lifecycle.transitionTo(InterceptorState.FAILED);
      throw err;
    }
  }
}
