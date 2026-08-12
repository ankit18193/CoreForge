export interface HealthSnapshot {
  readonly status: 'HEALTHY' | 'UNHEALTHY';
  readonly runtime: {
    readonly state: string;
    readonly nodeVersion: string;
    readonly pid: number;
  };
  readonly http: {
    readonly state: string;
    readonly activeConnections: number;
  };
  readonly modules: {
    readonly registeredCount: number;
    readonly names: readonly string[];
  };
  readonly container: {
    readonly totalServices: number;
  };
  readonly logger: {
    readonly level: string;
  };
  readonly memory: {
    readonly rss: number;
    readonly heapUsed: number;
    readonly heapTotal: number;
  };
  readonly uptime: number;
}
