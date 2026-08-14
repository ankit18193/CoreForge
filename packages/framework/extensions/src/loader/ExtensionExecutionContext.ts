import { RuntimeOrchestrator } from '@coreforge/contracts';

import { ExtensionDiagnostics } from '../diagnostics/ExtensionDiagnostics';
import { ExtensionLifecycleManager } from '../lifecycle/ExtensionLifecycleManager';
import { ExtensionRegistry } from '../registry/ExtensionRegistry';

export class ExtensionExecutionContext {
  public readonly orchestrator: RuntimeOrchestrator | undefined;
  public readonly extensionRegistry = new ExtensionRegistry();
  public readonly lifecycle = new ExtensionLifecycleManager();
  public readonly diagnostics = new ExtensionDiagnostics();

  constructor(orchestrator?: RuntimeOrchestrator) {
    this.orchestrator = orchestrator;
  }
}
