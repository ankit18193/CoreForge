import { ExtensionDescriptor, ExtensionManager as IExtensionManager } from '@coreforge/contracts';

import { ExtensionConfiguration } from './ExtensionConfiguration';
import { ExtensionDiagnostics } from '../diagnostics/ExtensionDiagnostics';
import { ExtensionStateError } from '../errors/ExtensionErrors';
import { ExtensionState } from '../lifecycle/ExtensionState';
import { ExtensionExecutionContext } from '../loader/ExtensionExecutionContext';
import { ExtensionLoader } from '../loader/ExtensionLoader';
import { ExtensionRegistrar } from '../loader/ExtensionRegistrar';

export class ExtensionManager implements IExtensionManager {
  private readonly _config: ExtensionConfiguration;
  private readonly _context: ExtensionExecutionContext;
  private readonly _registrar: ExtensionRegistrar;
  private readonly _loader: ExtensionLoader;

  private readonly _runningOperations = new Set<string>();

  constructor(config: ExtensionConfiguration, context?: ExtensionExecutionContext) {
    this._config = config;
    this._context = context || new ExtensionExecutionContext();
    this._registrar = new ExtensionRegistrar(this._context);
    this._loader = new ExtensionLoader(this._context);
  }

  public get config(): ExtensionConfiguration {
    return this._config;
  }

  public get state(): ExtensionState {
    return this._context.lifecycle.state;
  }

  public get diagnostics(): ExtensionDiagnostics {
    return this._context.diagnostics;
  }

  public get context(): ExtensionExecutionContext {
    return this._context;
  }

  public register(extension: ExtensionDescriptor): void {
    this._registrar.register(extension);
  }

  public async enable(id: string): Promise<void> {
    if (this._runningOperations.has(id)) {
      throw new ExtensionStateError(
        `ExtensionManager: enable() operation is already running for extension "${id}".`,
      );
    }
    this._runningOperations.add(id);

    try {
      if (this.state === ExtensionState.CREATED) {
        await this._loader.load();
      }

      const timestamp = Date.now();
      const registry = this._context.extensionRegistry;
      if (!registry.has(id)) {
        throw new ExtensionStateError(
          `ExtensionManager: Extension "${id}" does not exist in registry.`,
        );
      }

      registry.enable(id);
      this._context.lifecycle.transitionTo(ExtensionState.ENABLED);
      this._context.diagnostics.recordTransition();
      this._context.diagnostics.recordEnable(timestamp, true);
    } catch (err: unknown) {
      this._context.diagnostics.recordEnable(Date.now(), false);
      throw err;
    } finally {
      this._runningOperations.delete(id);
    }
  }

  public async disable(id: string): Promise<void> {
    if (this._runningOperations.has(id)) {
      throw new ExtensionStateError(
        `ExtensionManager: disable() operation is already running for extension "${id}".`,
      );
    }
    this._runningOperations.add(id);

    try {
      const timestamp = Date.now();
      const registry = this._context.extensionRegistry;
      if (!registry.has(id)) {
        throw new ExtensionStateError(
          `ExtensionManager: Extension "${id}" does not exist in registry.`,
        );
      }

      registry.disable(id);
      this._context.lifecycle.transitionTo(ExtensionState.DISABLED);
      this._context.diagnostics.recordTransition();
      this._context.diagnostics.recordDisable(timestamp);
    } finally {
      this._runningOperations.delete(id);
    }
  }

  public registered(): readonly ExtensionDescriptor[] {
    return this._context.extensionRegistry.getRegistered();
  }
}
