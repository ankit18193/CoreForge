import {
  InitializationResult,
  RuntimeAssembly,
  RuntimeInitializer as IRuntimeInitializer,
} from '@coreforge/contracts';

import { RuntimeInitializerConfiguration } from './RuntimeInitializerConfiguration';
import { RuntimeInitializationDiagnostics } from '../diagnostics/RuntimeInitializationDiagnostics';
import { InitializationExecutor } from '../executor/InitializationExecutor';
import { RuntimeBuilder } from '../executor/RuntimeBuilder';
import { RuntimeInitializationProfiler } from '../internal/RuntimeInitializationProfiler';
import { RuntimeInitializationLifecycleManager } from '../lifecycle/RuntimeInitializationLifecycleManager';
import { RuntimeInitializationState } from '../lifecycle/RuntimeInitializationState';
import { InitializationPlanner } from '../planner/InitializationPlanner';
import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class RuntimeInitializer implements IRuntimeInitializer {
  private readonly _config: RuntimeInitializerConfiguration;
  private readonly _lifecycle = new RuntimeInitializationLifecycleManager();
  private readonly _diagnostics = new RuntimeInitializationDiagnostics();

  constructor(config: RuntimeInitializerConfiguration) {
    this._config = config;
  }

  public get state(): RuntimeInitializationState {
    return this._lifecycle.state;
  }

  public get diagnostics(): RuntimeInitializationDiagnostics {
    return this._diagnostics;
  }

  public get config(): RuntimeInitializerConfiguration {
    return this._config;
  }

  public async initialize(
    assembly: RuntimeAssembly,
  ): Promise<InitializationResult> {
    const totalProfiler = new RuntimeInitializationProfiler();
    totalProfiler.start();

    this._lifecycle.transitionTo(RuntimeInitializationState.PLANNING);
    const planProfiler = new RuntimeInitializationProfiler();
    planProfiler.start();

    const planner = new InitializationPlanner();
    planner.plan(assembly);
    const planTime = planProfiler.durationMs;

    this._lifecycle.transitionTo(RuntimeInitializationState.INITIALIZING);

    const registry = new RuntimeRegistry();
    const rollback = new InitializationRollbackManager();
    const executor = new InitializationExecutor();

    const execProfiler = new RuntimeInitializationProfiler();
    execProfiler.start();

    let rollbackProfiler: RuntimeInitializationProfiler | undefined;
    try {
      await executor.execute(assembly, registry, rollback);
    } catch (err) {
      this._diagnostics.recordFailure();
      this._diagnostics.recordRollback();

      rollbackProfiler = new RuntimeInitializationProfiler();
      rollbackProfiler.start();

      this._lifecycle.transitionTo(RuntimeInitializationState.ROLLING_BACK);
      this._lifecycle.transitionTo(RuntimeInitializationState.FAILED);

      this._diagnostics.recordTimings(
        planTime,
        totalProfiler.durationMs,
        execProfiler.durationMs,
        rollbackProfiler.durationMs,
      );
      throw err;
    }
    const execTime = execProfiler.durationMs;

    const builder = new RuntimeBuilder();
    const runtime = builder.build(registry);

    this._lifecycle.transitionTo(RuntimeInitializationState.READY);
    registry.makeReady();

    this._diagnostics.recordTimings(
      planTime,
      totalProfiler.durationMs,
      execTime,
      rollbackProfiler ? rollbackProfiler.durationMs : 0,
    );
    this._diagnostics.recordCounts(
      registry.modules.length,
      registry.providers.length,
      registry.controllers.length,
      registry.routes.length,
      registry.middleware.length,
      registry.interceptors.length,
      registry.security.length,
    );

    return { runtime };
  }
}
