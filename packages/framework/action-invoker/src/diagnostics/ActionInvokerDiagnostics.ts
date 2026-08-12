import { InvocationStatistics } from './InvocationStatistics';

export interface ActionInvokerDiagnosticsSnapshot {
  readonly totalInvocations: number;
  readonly successfulInvocations: number;
  readonly failedInvocations: number;
  readonly averageExecutionTime: number;
  readonly slowestActionName: string;
  readonly slowestActionDuration: number;
  readonly controllerCounts: Readonly<Record<string, number>>;
  readonly actionCounts: Readonly<Record<string, number>>;
}

export class ActionInvokerDiagnostics {
  private readonly _stats: InvocationStatistics;

  constructor(stats: InvocationStatistics) {
    this._stats = stats;
  }

  public getSnapshot(): ActionInvokerDiagnosticsSnapshot {
    const controllers: Record<string, number> = {};
    for (const [k, v] of this._stats.controllerCounts.entries()) {
      controllers[k] = v;
    }

    const actions: Record<string, number> = {};
    for (const [k, v] of this._stats.actionCounts.entries()) {
      actions[k] = v;
    }

    return {
      totalInvocations: this._stats.totalInvocations,
      successfulInvocations: this._stats.successfulInvocations,
      failedInvocations: this._stats.failedInvocations,
      averageExecutionTime: this._stats.averageExecutionTime,
      slowestActionName: this._stats.slowestActionName,
      slowestActionDuration: this._stats.slowestActionDuration,
      controllerCounts: Object.freeze(controllers),
      actionCounts: Object.freeze(actions),
    };
  }
}
