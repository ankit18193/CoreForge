import { InterceptorStatistics } from './InterceptorStatistics';

export interface InterceptorDiagnosticsSnapshot {
  readonly totalInterceptions: number;
  readonly totalExecutions: number;
  readonly skippedInvocations: number;
  readonly exceptionCount: number;
  readonly averageBeforeDurationMs: number;
  readonly averageAfterDurationMs: number;
  readonly slowestInterceptorDuration: number;
  readonly slowestInterceptorName: string;
  readonly executionCounts: Readonly<Record<string, number>>;
}

export class InterceptorDiagnostics {
  private readonly _stats: InterceptorStatistics;

  constructor(stats: InterceptorStatistics) {
    this._stats = stats;
  }

  public getSnapshot(): InterceptorDiagnosticsSnapshot {
    const execCounts: Record<string, number> = {};
    for (const [k, v] of this._stats.executionCounts.entries()) {
      execCounts[k] = v;
    }

    return {
      totalInterceptions: this._stats.totalInterceptions,
      totalExecutions: this._stats.totalExecutions,
      skippedInvocations: this._stats.skippedInvocations,
      exceptionCount: this._stats.exceptionCount,
      averageBeforeDurationMs: this._stats.averageBeforeDurationMs,
      averageAfterDurationMs: this._stats.averageAfterDurationMs,
      slowestInterceptorDuration: this._stats.slowestInterceptorDuration,
      slowestInterceptorName: this._stats.slowestInterceptorName,
      executionCounts: Object.freeze(execCounts),
    };
  }
}
