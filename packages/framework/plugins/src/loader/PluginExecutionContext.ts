import { ExtensionManager } from '@coreforge/contracts';

import { PluginDiagnostics } from '../diagnostics/PluginDiagnostics';
import { PluginLifecycleManager } from '../lifecycle/PluginLifecycleManager';
import { PluginRegistry } from '../registry/PluginRegistry';
import { PluginRegistryManager } from '../registry/PluginRegistryManager';

export class PluginExecutionContext {
  public readonly extensionEngine: ExtensionManager | undefined;
  public readonly pluginRegistry = new PluginRegistry();
  public readonly registryManager = new PluginRegistryManager(
    this.pluginRegistry,
  );
  public readonly lifecycle = new PluginLifecycleManager();
  public readonly diagnostics = new PluginDiagnostics();

  constructor(extensionEngine?: ExtensionManager) {
    this.extensionEngine = extensionEngine;
  }
}
