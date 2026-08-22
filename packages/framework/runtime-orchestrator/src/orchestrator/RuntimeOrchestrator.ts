import {
  InitializedRuntime,
  RuntimeExecutionResult,
  RuntimeOrchestrator as IRuntimeOrchestrator,
} from '@coreforge/contracts';

import { RuntimeOrchestratorConfiguration } from './RuntimeOrchestratorConfiguration';
import { RuntimeExecutionDiagnostics } from '../diagnostics/RuntimeExecutionDiagnostics';
import { RuntimeExecutionStateError } from '../errors/RuntimeExecutionErrors';
import { HealthMonitor } from '../executor/HealthMonitor';
import { HealthSupervisor } from '../executor/HealthSupervisor';
import { RuntimeExecutionBuilder } from '../executor/RuntimeExecutionBuilder';
import { RuntimeExecutor } from '../executor/RuntimeExecutor';
import { RuntimeExecutionProfiler } from '../internal/RuntimeExecutionProfiler';
import { RuntimeExecutionLifecycleManager } from '../lifecycle/RuntimeExecutionLifecycleManager';
import { RuntimeExecutionState } from '../lifecycle/RuntimeExecutionState';
import { ExecutionPlanner } from '../planner/ExecutionPlanner';
import { RuntimeExecutionRegistry } from '../registry/RuntimeExecutionRegistry';
import { RuntimeShutdownRollbackManager } from '../rollback/RuntimeShutdownRollbackManager';

export class RuntimeOrchestrator implements IRuntimeOrchestrator {
  private readonly _config: RuntimeOrchestratorConfiguration;
  private readonly _lifecycle = new RuntimeExecutionLifecycleManager();
  private readonly _diagnostics = new RuntimeExecutionDiagnostics();
  private _registry = new RuntimeExecutionRegistry();

  constructor(config: RuntimeOrchestratorConfiguration) {
    this._config = config;
  }

  public get state(): RuntimeExecutionState {
    return this._lifecycle.state;
  }

  public get diagnostics(): RuntimeExecutionDiagnostics {
    return this._diagnostics;
  }

  public get config(): RuntimeOrchestratorConfiguration {
    return this._config;
  }

  public get registry(): RuntimeExecutionRegistry {
    return this._registry;
  }

  public async start(runtime: InitializedRuntime): Promise<RuntimeExecutionResult> {
    if (
      this._lifecycle.state === RuntimeExecutionState.STARTING ||
      this._lifecycle.state === RuntimeExecutionState.RUNNING
    ) {
      throw new RuntimeExecutionStateError(
        'RuntimeOrchestrator: start() was rejected because the engine is already starting or running.',
      );
    }

    const startProfiler = new RuntimeExecutionProfiler();
    startProfiler.start();

    this._lifecycle.transitionTo(RuntimeExecutionState.STARTING);
    this._diagnostics.recordTransition();

    const planner = new ExecutionPlanner();
    planner.plan(runtime);

    const rollback = new RuntimeShutdownRollbackManager();
    const executor = new RuntimeExecutor();

    try {
      await executor.start(runtime, this._registry, rollback);
    } catch (err) {
      const rollbackProfiler = new RuntimeExecutionProfiler();
      rollbackProfiler.start();

      await rollback.rollback();

      this._lifecycle.transitionTo(RuntimeExecutionState.FAILED);
      this._diagnostics.recordTransition();

      this._diagnostics.recordRollback(rollbackProfiler.durationMs);
      this._diagnostics.recordStart(0);
      throw err;
    }

    this._registry.makeReadOnly();

    const monitor = new HealthMonitor(this._registry);
    const supervisor = new HealthSupervisor(monitor, this._lifecycle);
    supervisor.supervise();

    const builder = new RuntimeExecutionBuilder();
    const result = builder.build(this._registry, true);

    this._lifecycle.transitionTo(RuntimeExecutionState.RUNNING);
    this._diagnostics.recordTransition();

    this._diagnostics.recordStart(startProfiler.durationMs);
    this._diagnostics.recordCounts(
      this._registry.getActiveComponents().length,
      supervisor.failedComponentsCount,
    );
    this._diagnostics.recordHealth(monitor.healthCheckCount, monitor.lastHealthCheckTimestamp);

    return result;
  }

  public async stop(): Promise<void> {
    if (this._lifecycle.state === RuntimeExecutionState.STOPPED) {
      return;
    }

    const stopProfiler = new RuntimeExecutionProfiler();
    stopProfiler.start();

    this._lifecycle.transitionTo(RuntimeExecutionState.STOPPING);
    this._diagnostics.recordTransition();

    const executor = new RuntimeExecutor();
    await executor.stop(this._registry);

    this._registry = new RuntimeExecutionRegistry();

    this._lifecycle.transitionTo(RuntimeExecutionState.STOPPED);
    this._diagnostics.recordTransition();

    this._diagnostics.recordStop(stopProfiler.durationMs);
  }
}
