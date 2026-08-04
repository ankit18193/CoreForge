export interface BootstrapDiagnostics {
  readonly startupDuration: number;
  readonly startupTimestamp: number;
  readonly shutdownTimestamp: number;
  readonly frameworkVersion: string;
  readonly nodeVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly processId: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly registeredModules: readonly string[];
  readonly loadedFrameworkServices: readonly string[];
  readonly registeredEventHandlers: number;
  readonly registeredReporters: readonly string[];
  readonly configurationSource: string;
}
