import { HttpDiagnosticsSnapshot } from './HttpDiagnosticsSnapshot';

export class HttpDiagnostics {
  private _totalRequests = 0;
  private _activeRequests = 0;
  private _activeConnections = 0;
  private _startupTimestamp = 0;
  private _requestDuration = 0;
  private _peakConcurrentRequests = 0;

  public setStartupTimestamp(timestamp: number): void {
    this._startupTimestamp = timestamp;
  }

  public requestReceived(): void {
    this._totalRequests++;
    this._activeRequests++;
    if (this._activeRequests > this._peakConcurrentRequests) {
      this._peakConcurrentRequests = this._activeRequests;
    }
  }

  public requestCompleted(durationMs: number): void {
    if (this._activeRequests > 0) {
      this._activeRequests--;
    }
    this._requestDuration += durationMs;
  }

  public connectionOpened(): void {
    this._activeConnections++;
  }

  public connectionClosed(): void {
    if (this._activeConnections > 0) {
      this._activeConnections--;
    }
  }

  public getSnapshot(): HttpDiagnosticsSnapshot {
    const uptime = this._startupTimestamp > 0 ? (Date.now() - this._startupTimestamp) / 1000 : 0;
    const avgLatency = this._totalRequests > 0 ? this._requestDuration / this._totalRequests : 0;

    return {
      totalRequests: this._totalRequests,
      activeRequests: this._activeRequests,
      activeConnections: this._activeConnections,
      startupTimestamp: this._startupTimestamp,
      serverUptime: uptime,
      requestDuration: this._requestDuration,
      averageLatency: avgLatency,
      peakConcurrentRequests: this._peakConcurrentRequests,
    };
  }
}
