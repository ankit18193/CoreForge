export interface ApplicationLifecycle {
  onStartup?(): Promise<void>;
  onShutdown?(): Promise<void>;
}
