import { ActionProfiler } from '../internal/ActionProfiler';
import { ControllerRegistry } from '../registry/ControllerRegistry';

export interface ControllerDiagnosticsSnapshot {
  readonly totalControllers: number;
  readonly totalActions: number;
  readonly registeredControllers: number;
  readonly executionCount: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageExecutionTime: number;
  readonly slowestController: string | null;
  readonly slowestAction: string | null;
}

export class ControllerDiagnostics {
  private readonly _registry: ControllerRegistry;
  private readonly _profiler: ActionProfiler;

  constructor(registry: ControllerRegistry, profiler: ActionProfiler) {
    this._registry = registry;
    this._profiler = profiler;
  }

  public getSnapshot(): ControllerDiagnosticsSnapshot {
    const controllers = this._registry.getAll();
    let totalActions = 0;
    for (const c of controllers) {
      totalActions += c.actions.length;
    }

    const records = this._profiler.records;
    let totalDuration = 0;
    let slowestDur = 0;
    let slowestControllerId: string | null = null;
    let slowestActionName: string | null = null;

    for (const r of records) {
      totalDuration += r.duration;
      if (r.duration > slowestDur) {
        slowestDur = r.duration;
        slowestControllerId = r.controllerId;
        slowestActionName = r.actionName;
      }
    }

    const averageExecution = records.length > 0 ? totalDuration / records.length : 0;

    return {
      totalControllers: controllers.length,
      totalActions,
      registeredControllers: controllers.length,
      executionCount: this._profiler.totalInvocations,
      successfulExecutions: this._profiler.successCount,
      failedExecutions: this._profiler.failedCount,
      averageExecutionTime: averageExecution,
      slowestController: slowestControllerId,
      slowestAction: slowestActionName,
    };
  }
}
