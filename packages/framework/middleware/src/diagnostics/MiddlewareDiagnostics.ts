import { MiddlewareProfiler } from '../internal/MiddlewareProfiler';
import { MiddlewareRegistry } from '../registry/MiddlewareRegistry';
import { MiddlewareScope } from '../registry/MiddlewareScope';

export interface MiddlewareDiagnosticsSnapshot {
  readonly totalMiddleware: number;
  readonly globalMiddleware: number;
  readonly groupMiddleware: number;
  readonly routeMiddleware: number;
  readonly executionCount: number;
  readonly averageExecutionTime: number;
  readonly slowestMiddleware: number;
  readonly skippedMiddleware: number;
  readonly terminatedRequests: number;
  readonly exceptions: number;
  readonly averagePipelineDepth: number;
}

export class MiddlewareDiagnostics {
  private readonly _profiler: MiddlewareProfiler;
  private readonly _registry: MiddlewareRegistry;

  constructor(profiler: MiddlewareProfiler, registry: MiddlewareRegistry) {
    this._profiler = profiler;
    this._registry = registry;
  }

  public getSnapshot(): MiddlewareDiagnosticsSnapshot {
    const all = this._registry.getAll();
    let globalCount = 0;
    let groupCount = 0;
    let routeCount = 0;

    for (const d of all) {
      if (d.scope === MiddlewareScope.GLOBAL) {
        globalCount++;
      } else if (d.scope === MiddlewareScope.GROUP) {
        groupCount++;
      } else if (d.scope === MiddlewareScope.ROUTE) {
        routeCount++;
      }
    }

    const records = this._profiler.records;
    let totalDuration = 0;
    let slowest = 0;
    for (const rec of records) {
      totalDuration += rec.duration;
      if (rec.duration > slowest) {
        slowest = rec.duration;
      }
    }
    const avgExecution = records.length > 0 ? totalDuration / records.length : 0;

    return {
      totalMiddleware: all.length,
      globalMiddleware: globalCount,
      groupMiddleware: groupCount,
      routeMiddleware: routeCount,
      executionCount: this._profiler.totalCalls,
      averageExecutionTime: avgExecution,
      slowestMiddleware: slowest,
      skippedMiddleware: this._profiler.skippedCount,
      terminatedRequests: this._profiler.terminatedCount,
      exceptions: this._profiler.exceptionsCount,
      averagePipelineDepth: this._profiler.averagePipelineDepth,
    };
  }
}
