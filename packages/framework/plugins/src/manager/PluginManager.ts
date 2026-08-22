import { PluginDescriptor, PluginManager as IPluginManager } from '@coreforge/contracts';

import { PluginConfiguration } from './PluginConfiguration';
import { PluginDiagnostics } from '../diagnostics/PluginDiagnostics';
import { PluginStateError } from '../errors/PluginErrors';
import { PluginState } from '../lifecycle/PluginState';
import { PluginExecutionContext } from '../loader/PluginExecutionContext';
import { PluginInitializer } from '../loader/PluginInitializer';
import { PluginLoader } from '../loader/PluginLoader';
import { PluginRegistrar } from '../loader/PluginRegistrar';

export class PluginManager implements IPluginManager {
  private readonly _config: PluginConfiguration;
  private readonly _context: PluginExecutionContext;
  private readonly _registrar: PluginRegistrar;
  private readonly _loader: PluginLoader;
  private readonly _initializer: PluginInitializer;

  private readonly _runningOperations = new Set<string>();

  constructor(config: PluginConfiguration, context?: PluginExecutionContext) {
    this._config = config;
    this._context = context || new PluginExecutionContext();
    this._registrar = new PluginRegistrar(this._context);
    this._loader = new PluginLoader(this._context);
    this._initializer = new PluginInitializer(this._context);
  }

  public get config(): PluginConfiguration {
    return this._config;
  }

  public get state(): PluginState {
    return this._context.lifecycle.state;
  }

  public get diagnostics(): PluginDiagnostics {
    return this._context.diagnostics;
  }

  public get context(): PluginExecutionContext {
    return this._context;
  }

  public get initializer(): PluginInitializer {
    return this._initializer;
  }

  public register(plugin: PluginDescriptor): void {
    this._registrar.register(plugin);
  }

  public async enable(id: string): Promise<void> {
    if (this._runningOperations.has(id)) {
      throw new PluginStateError(
        `PluginManager: enable() operation is already running for plugin "${id}".`,
      );
    }
    this._runningOperations.add(id);

    try {
      if (this.state === PluginState.CREATED || this.state === PluginState.REGISTERED) {
        await this._loader.load();
      }

      const timestamp = Date.now();
      const registry = this._context.registryManager;
      if (!registry.has(id)) {
        throw new PluginStateError(`PluginManager: Plugin "${id}" does not exist in registry.`);
      }

      registry.enable(id);
      this._context.lifecycle.transitionTo(PluginState.ENABLED);
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
      throw new PluginStateError(
        `PluginManager: disable() operation is already running for plugin "${id}".`,
      );
    }
    this._runningOperations.add(id);

    try {
      const timestamp = Date.now();
      const registry = this._context.registryManager;
      if (!registry.has(id)) {
        throw new PluginStateError(`PluginManager: Plugin "${id}" does not exist in registry.`);
      }

      registry.disable(id);
      this._context.lifecycle.transitionTo(PluginState.DISABLED);
      this._context.diagnostics.recordTransition();
      this._context.diagnostics.recordDisable(timestamp);
    } finally {
      this._runningOperations.delete(id);
    }
  }

  public registered(): readonly PluginDescriptor[] {
    return this._context.registryManager.getRegistered();
  }
}
