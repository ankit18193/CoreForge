import { RuntimeExecutionRegistry } from '../registry/RuntimeExecutionRegistry';

export interface ComponentHealth {
  readonly id: string;
  readonly status: 'UP' | 'DOWN' | 'UNKNOWN';
}

export class HealthMonitor {
  private readonly _registry: RuntimeExecutionRegistry;
  private _healthCheckCount = 0;
  private _lastHealthCheckTimestamp = 0;

  constructor(registry: RuntimeExecutionRegistry) {
    this._registry = registry;
  }

  public get healthCheckCount(): number {
    return this._healthCheckCount;
  }

  public get lastHealthCheckTimestamp(): number {
    return this._lastHealthCheckTimestamp;
  }

  public runHealthCheck(): ComponentHealth[] {
    this._healthCheckCount++;
    this._lastHealthCheckTimestamp = Date.now();

    const results: ComponentHealth[] = [];
    for (const comp of this._registry.getActiveComponents()) {
      const id = (comp as { id: string }).id;
      const state = (comp as { state?: string }).state;
      const status = state === 'FAILED' ? 'DOWN' : 'UP';
      results.push({ id, status });
    }
    return results;
  }
}
