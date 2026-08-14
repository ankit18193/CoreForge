export interface RuntimeExecutionDiagnosticsSnapshot {
  readonly startupDurationMs: number;
  readonly shutdownDurationMs: number;
  readonly uptimeMs: number;
  readonly rollbackDurationMs: number;
  readonly runtimeStateTransitions: number;
  readonly activeComponentCount: number;
  readonly failedComponentCount: number;
  readonly healthCheckCount: number;
  readonly lastHealthCheckTimestamp: number;
}

export class RuntimeExecutionDiagnostics {
  private _startupTimeMs = 0;
  private _shutdownTimeMs = 0;
  private _startTime = 0;
  private _rollbackTimeMs = 0;

  private _transitions = 0;
  private _activeComponents = 0;
  private _failedComponents = 0;

  private _healthCheckCount = 0;
  private _lastHealthCheckTimestamp = 0;

  public recordStart(duration: number): void {
    this._startupTimeMs = duration;
    this._startTime = Date.now();
  }

  public recordStop(duration: number): void {
    this._shutdownTimeMs = duration;
  }

  public recordRollback(duration: number): void {
    this._rollbackTimeMs = duration;
  }

  public recordTransition(): void {
    this._transitions++;
  }

  public recordCounts(active: number, failed: number): void {
    this._activeComponents = active;
    this._failedComponents = failed;
  }

  public recordHealth(count: number, timestamp: number): void {
    this._healthCheckCount = count;
    this._lastHealthCheckTimestamp = timestamp;
  }

  public getSnapshot(): RuntimeExecutionDiagnosticsSnapshot {
    const uptime = this._startTime === 0 ? 0 : Date.now() - this._startTime;
    return {
      startupDurationMs: this._startupTimeMs,
      shutdownDurationMs: this._shutdownTimeMs,
      uptimeMs: uptime,
      rollbackDurationMs: this._rollbackTimeMs,
      runtimeStateTransitions: this._transitions,
      activeComponentCount: this._activeComponents,
      failedComponentCount: this._failedComponents,
      healthCheckCount: this._healthCheckCount,
      lastHealthCheckTimestamp: this._lastHealthCheckTimestamp,
    };
  }
}
