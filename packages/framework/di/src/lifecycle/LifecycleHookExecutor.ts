import { DependencyDiagnostics } from '../diagnostics/DependencyDiagnostics';
import { LifecycleHookError } from '../errors/DependencyErrors';
import { DependencyProfiler } from '../internal/DependencyProfiler';
import { OnInit, OnDestroy } from '../types/dependencyTypes';

export class LifecycleHookExecutor {
  private readonly _initializedInstances = new WeakSet<object>();
  private readonly _destroyedInstances = new WeakSet<object>();

  public async executeOnInit(
    instance: unknown,
    tokenName: string,
    diagnostics?: DependencyDiagnostics,
  ): Promise<void> {
    if (!instance || typeof instance !== 'object') {
      return;
    }

    if (this._initializedInstances.has(instance)) {
      return;
    }

    const onInitFn = (instance as Partial<OnInit>).onInit;
    if (typeof onInitFn === 'function') {
      const profiler = new DependencyProfiler();
      profiler.start();
      try {
        await Promise.resolve(onInitFn.call(instance));
        this._initializedInstances.add(instance);
        const duration = profiler.stop();
        if (diagnostics) {
          diagnostics.recordLifecycleHookDuration(duration);
        }
      } catch (err) {
        profiler.stop();
        throw new LifecycleHookError('onInit', tokenName, err);
      }
    } else {
      this._initializedInstances.add(instance);
    }
  }

  public async executeOnDestroy(
    instance: unknown,
    tokenName: string,
    diagnostics?: DependencyDiagnostics,
  ): Promise<void> {
    if (!instance || typeof instance !== 'object') {
      return;
    }

    if (this._destroyedInstances.has(instance)) {
      return;
    }

    const onDestroyFn = (instance as Partial<OnDestroy>).onDestroy;
    if (typeof onDestroyFn === 'function') {
      const profiler = new DependencyProfiler();
      profiler.start();
      try {
        await Promise.resolve(onDestroyFn.call(instance));
        this._destroyedInstances.add(instance);
        const duration = profiler.stop();
        if (diagnostics) {
          diagnostics.recordLifecycleHookDuration(duration);
        }
      } catch (err) {
        profiler.stop();
        throw new LifecycleHookError('onDestroy', tokenName, err);
      }
    } else {
      this._destroyedInstances.add(instance);
    }
  }
}
