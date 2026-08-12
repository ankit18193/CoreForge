import { RequestProfiler } from '../internal/RequestProfiler';

export interface RequestDiagnosticsSnapshot {
  readonly totalRequests: number;
  readonly completedRequests: number;
  readonly failedRequests: number;
  readonly cancelledRequests: number;
  readonly averageDuration: number;
  readonly percentile95: number;
  readonly slowestRequest: number;
  readonly routingTime: number;
  readonly middlewareTime: number;
  readonly controllerTime: number;
  readonly responseTime: number;
}

export class RequestDiagnostics {
  private readonly _profiler: RequestProfiler;

  constructor(profiler: RequestProfiler) {
    this._profiler = profiler;
  }

  public getSnapshot(): RequestDiagnosticsSnapshot {
    return {
      totalRequests: this._profiler.totalRequests,
      completedRequests: this._profiler.completedRequests,
      failedRequests: this._profiler.failedRequests,
      cancelledRequests: this._profiler.cancelledRequests,
      averageDuration: this._profiler.averageDuration,
      percentile95: this._profiler.percentile95,
      slowestRequest: this._profiler.slowestDuration,
      routingTime: this._profiler.getStageDuration('ROUTING'),
      middlewareTime: this._profiler.getStageDuration('MIDDLEWARE'),
      controllerTime: this._profiler.getStageDuration('CONTROLLER'),
      responseTime: this._profiler.getStageDuration('RESPONDING'),
    };
  }
}
