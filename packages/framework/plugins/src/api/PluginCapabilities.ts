export interface PluginCapabilities {
  readonly logger: unknown;
  readonly eventBus: unknown;
  readonly config: unknown;
  readonly diContainer: unknown;
  readonly metadataRegistry: unknown;
  readonly extensionManager: unknown;
  readonly runtimeExecutionRegistry: unknown;
}
