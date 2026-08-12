import { MiddlewareExecutionContext } from './MiddlewareExecutionContext';
import { MiddlewareState } from './MiddlewareState';
import { MiddlewareDiagnostics, MiddlewareDiagnosticsSnapshot } from '../diagnostics/MiddlewareDiagnostics';
import { MiddlewareExecutionError } from '../errors/MiddlewareErrors';
import { MiddlewareResult } from '../execution/MiddlewareResult';
import { MiddlewareExecutor } from '../executor/MiddlewareExecutor';
import { PipelineTarget } from '../executor/PipelineTarget';
import { MiddlewareProfiler } from '../internal/MiddlewareProfiler';
import { MiddlewareLifecycleManager } from '../lifecycle/MiddlewareLifecycleManager';
import { MiddlewareRegistry } from '../registry/MiddlewareRegistry';

export class MiddlewarePipeline {
  private readonly _registry: MiddlewareRegistry;
  private readonly _lifecycleManager: MiddlewareLifecycleManager;
  private readonly _profiler = new MiddlewareProfiler();
  private readonly _diagnostics: MiddlewareDiagnostics;
  private readonly _executor: MiddlewareExecutor;

  constructor(
    registry: MiddlewareRegistry,
    lifecycleManager: MiddlewareLifecycleManager,
  ) {
    this._registry = registry;
    this._lifecycleManager = lifecycleManager;
    this._diagnostics = new MiddlewareDiagnostics(this._profiler, this._registry);
    this._executor = new MiddlewareExecutor(this._profiler);
  }

  public get state(): MiddlewareState {
    return this._lifecycleManager.state;
  }

  public get diagnostics(): MiddlewareDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public get registry(): MiddlewareRegistry {
    return this._registry;
  }

  public async execute(
    context: MiddlewareExecutionContext,
    target: PipelineTarget,
    options?: { groupName?: string; routePath?: string },
  ): Promise<MiddlewareResult> {
    if (
      this._lifecycleManager.state === MiddlewareState.STOPPED ||
      this._lifecycleManager.state === MiddlewareState.STOPPING
    ) {
      throw new MiddlewareExecutionError('Cannot execute middleware pipeline when stopped.');
    }

    if (this._lifecycleManager.state === MiddlewareState.READY) {
      this._lifecycleManager.transitionTo(MiddlewareState.RUNNING);
    }

    const start = Date.now();
    let completed = false;
    let exceptionThrown = false;
    const initialExecuted = this._profiler.totalCalls;
    const initialSkipped = this._profiler.skippedCount;

    try {
      const globalMw = this._registry.getGlobal();
      const groupMw = options?.groupName ? this._registry.getGroup(options.groupName) : [];
      const routeMw = options?.routePath ? this._registry.getRoute(options.routePath) : [];

      const combined = [...globalMw, ...groupMw, ...routeMw];

      const execResult = await this._executor.execute(combined, context, target);
      completed = execResult.completed;
    } catch (err: unknown) {
      exceptionThrown = true;
      throw err;
    } finally {
      if (this._lifecycleManager.state === MiddlewareState.RUNNING) {
        this._lifecycleManager.transitionTo(MiddlewareState.READY);
      }
    }

    const duration = Date.now() - start;
    const executedCount = this._profiler.totalCalls - initialExecuted;
    const skippedCount = this._profiler.skippedCount - initialSkipped;

    return {
      completed,
      terminatedEarly: !completed && !exceptionThrown,
      exceptionThrown,
      executedCount,
      skippedCount,
      duration,
    };
  }
}
