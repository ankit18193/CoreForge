export interface HttpDiagnosticsSnapshot {
  readonly totalRequests: number;
  readonly activeRequests: number;
  readonly activeConnections: number;
  readonly startupTimestamp: number;
  readonly serverUptime: number;
  readonly requestDuration: number;
  readonly averageLatency: number;
  readonly peakConcurrentRequests: number;
}
