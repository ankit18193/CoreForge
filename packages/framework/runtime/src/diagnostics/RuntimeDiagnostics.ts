import { RuntimeDiagnosticsSnapshot, RuntimeState } from '../types/runtimeTypes';

export class RuntimeDiagnostics {
  private _totalRequests = 0;
  private _successfulRequests = 0;
  private _failedRequests = 0;
  private _startupDurationMs = 0;
  private _shutdownDurationMs = 0;
  private _totalRequestDurationMs = 0;
  private _slowestRequestDurationMs = 0;
  private _startupFailures = 0;
  private _routingFailures = 0;
  private _executionFailures = 0;
  private _responseFailures = 0;
  private _exceptionFailures = 0;
  private _transportFailures = 0;

  public recordStartupSuccess(durationMs: number): void {
    this._startupDurationMs = durationMs;
  }

  public recordStartupFailure(): void {
    this._startupFailures++;
  }

  public recordShutdown(durationMs: number): void {
    this._shutdownDurationMs = durationMs;
  }

  public recordRequestSuccess(durationMs: number): void {
    this._totalRequests++;
    this._successfulRequests++;
    this._totalRequestDurationMs += durationMs;
    if (durationMs > this._slowestRequestDurationMs) {
      this._slowestRequestDurationMs = durationMs;
    }
  }

  public recordRequestFailure(durationMs: number): void {
    this._totalRequests++;
    this._failedRequests++;
    this._totalRequestDurationMs += durationMs;
    if (durationMs > this._slowestRequestDurationMs) {
      this._slowestRequestDurationMs = durationMs;
    }
  }

  public recordRoutingFailure(): void {
    this._routingFailures++;
  }

  public recordExecutionFailure(): void {
    this._executionFailures++;
  }

  public recordResponseFailure(): void {
    this._responseFailures++;
  }

  public recordExceptionFailure(): void {
    this._exceptionFailures++;
  }

  public recordTransportFailure(): void {
    this._transportFailures++;
  }

  public getSnapshot(
    state: RuntimeState,
    activeRequests: number,
    startedAt?: number,
    stoppedAt?: number,
  ): RuntimeDiagnosticsSnapshot {
    const avg = this._totalRequests > 0 ? this._totalRequestDurationMs / this._totalRequests : 0;

    return Object.freeze({
      totalRequests: this._totalRequests,
      successfulRequests: this._successfulRequests,
      failedRequests: this._failedRequests,
      activeRequests,
      startupDurationMs: this._startupDurationMs,
      shutdownDurationMs: this._shutdownDurationMs,
      averageRequestDurationMs: avg,
      slowestRequestDurationMs: this._slowestRequestDurationMs,
      startupFailures: this._startupFailures,
      routingFailures: this._routingFailures,
      executionFailures: this._executionFailures,
      responseFailures: this._responseFailures,
      exceptionFailures: this._exceptionFailures,
      transportFailures: this._transportFailures,
      state,
      startedAt,
      stoppedAt,
      timestamp: Date.now(),
    });
  }

  public reset(): void {
    this._totalRequests = 0;
    this._successfulRequests = 0;
    this._failedRequests = 0;
    this._startupDurationMs = 0;
    this._shutdownDurationMs = 0;
    this._totalRequestDurationMs = 0;
    this._slowestRequestDurationMs = 0;
    this._startupFailures = 0;
    this._routingFailures = 0;
    this._executionFailures = 0;
    this._responseFailures = 0;
    this._exceptionFailures = 0;
    this._transportFailures = 0;
  }
}
