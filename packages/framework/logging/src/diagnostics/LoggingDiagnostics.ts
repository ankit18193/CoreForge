import { LoggingDiagnosticsSnapshot, LogLevel } from '../types/loggingTypes';

export class LoggingDiagnostics {
  private _totalLogs = 0;
  private readonly _logsByLevel: Record<LogLevel, number> = {
    TRACE: 0,
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    FATAL: 0,
  };
  private _processorFailures = 0;
  private _sinkFailures = 0;
  private _totalProcessingDurationMs = 0;
  private _slowestProcessingDurationMs = 0;

  public recordLog(level: LogLevel, durationMs: number): void {
    this._totalLogs++;
    this._logsByLevel[level] = (this._logsByLevel[level] || 0) + 1;
    this._totalProcessingDurationMs += durationMs;
    if (durationMs > this._slowestProcessingDurationMs) {
      this._slowestProcessingDurationMs = durationMs;
    }
  }

  public recordProcessorFailure(): void {
    this._processorFailures++;
  }

  public recordSinkFailure(): void {
    this._sinkFailures++;
  }

  public getSnapshot(): LoggingDiagnosticsSnapshot {
    const avg = this._totalLogs > 0 ? this._totalProcessingDurationMs / this._totalLogs : 0;
    return Object.freeze({
      totalLogs: this._totalLogs,
      logsByLevel: Object.freeze({ ...this._logsByLevel }),
      processorFailures: this._processorFailures,
      sinkFailures: this._sinkFailures,
      averageProcessingDurationMs: avg,
      slowestProcessingDurationMs: this._slowestProcessingDurationMs,
    });
  }

  public reset(): void {
    this._totalLogs = 0;
    for (const lvl of Object.keys(this._logsByLevel) as LogLevel[]) {
      this._logsByLevel[lvl] = 0;
    }
    this._processorFailures = 0;
    this._sinkFailures = 0;
    this._totalProcessingDurationMs = 0;
    this._slowestProcessingDurationMs = 0;
  }
}
