import { HealthSnapshot } from './HealthSnapshot';
import { KernelState } from '../kernel/KernelState';
import { ApplicationRegistry } from '../registry/ApplicationRegistry';

export interface ApplicationDiagnosticsSnapshot {
  readonly applicationId: string;
  readonly processId: number;
  readonly frameworkVersion: string;
  readonly nodeVersion: string;
  readonly uptimeSeconds: number;
  readonly startupDurationMs: number;
  readonly shutdownDurationMs: number;
  readonly state: KernelState;
  readonly memoryUsage: {
    readonly rss: number;
    readonly heapUsed: number;
    readonly heapTotal: number;
  };
  readonly registry: {
    readonly totalModules: number;
    readonly totalRoutes: number;
    readonly totalControllers: number;
    readonly totalInterceptors: number;
    readonly totalSerializers: number;
    readonly totalAuthProviders: number;
    readonly totalServices: number;
    readonly totalEvents: number;
  };
}

export class ApplicationDiagnostics {
  private readonly _applicationId: string;
  private readonly _registry: ApplicationRegistry;
  private readonly _startTime = Date.now();
  private _state = KernelState.CREATED;
  private _startupDuration = 0;
  private _shutdownDuration = 0;

  constructor(applicationId: string, registry: ApplicationRegistry) {
    this._applicationId = applicationId;
    this._registry = registry;
  }

  public setDiagnosticsState(state: KernelState): void {
    this._state = state;
  }

  public recordStartupDuration(durationMs: number): void {
    this._startupDuration = durationMs;
  }

  public recordShutdownDuration(durationMs: number): void {
    this._shutdownDuration = durationMs;
  }

  public getSnapshot(): ApplicationDiagnosticsSnapshot {
    const mem = process.memoryUsage();
    return {
      applicationId: this._applicationId,
      processId: process.pid,
      frameworkVersion: '0.1.0',
      nodeVersion: process.version,
      uptimeSeconds: (Date.now() - this._startTime) / 1000,
      startupDurationMs: this._startupDuration,
      shutdownDurationMs: this._shutdownDuration,
      state: this._state,
      memoryUsage: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      registry: {
        totalModules: this._registry.modules.length,
        totalRoutes: this._registry.routes.length,
        totalControllers: this._registry.controllers.length,
        totalInterceptors: this._registry.interceptors.length,
        totalSerializers: this._registry.serializers.length,
        totalAuthProviders: this._registry.authProviders.length,
        totalServices: this._registry.services.length,
        totalEvents: this._registry.events.length,
      },
    };
  }

  public getHealthSnapshot(): HealthSnapshot {
    const mem = process.memoryUsage();
    const isHealthy = this._state === KernelState.RUNNING;
    return {
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      runtime: {
        state: this._state,
        nodeVersion: process.version,
        pid: process.pid,
      },
      http: {
        state: isHealthy ? 'ACTIVE' : 'INACTIVE',
        activeConnections: 0,
      },
      modules: {
        registeredCount: this._registry.modules.length,
        names: this._registry.modules,
      },
      container: {
        totalServices: this._registry.services.length,
      },
      logger: {
        level: 'INFO',
      },
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      uptime: (Date.now() - this._startTime) / 1000,
    };
  }
}
