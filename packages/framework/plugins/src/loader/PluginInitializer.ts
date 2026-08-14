import { Plugin } from '@coreforge/contracts';

import { PluginExecutionContext } from './PluginExecutionContext';
import { PluginContext } from '../api/PluginContext';
import { PluginSandbox } from '../api/PluginSandbox';
import { PluginValidationError } from '../errors/PluginErrors';
import { PluginProfiler } from '../internal/PluginProfiler';

export class PluginInitializer {
  private readonly _context: PluginExecutionContext;
  private readonly _initializedPlugins = new Set<string>();
  private readonly _shutdownPlugins = new Set<string>();

  constructor(context: PluginExecutionContext) {
    this._context = context;
  }

  public async initializePlugin(id: string, plugin: Plugin): Promise<void> {
    if (this._initializedPlugins.has(id)) {
      throw new PluginValidationError(
        `PluginInitializer: Plugin "${id}" has already been initialized.`,
      );
    }

    const profiler = new PluginProfiler();
    profiler.start();

    try {
      const rawContext = new PluginContext({
        logger: {},
        eventBus: {},
        config: {},
        diContainer: {},
        metadataRegistry: {},
        extensionManager: this._context.extensionEngine || {},
        runtimeExecutionRegistry: {},
      });

      const sandbox = new PluginSandbox();
      const sandboxedContext = sandbox.createSandbox(rawContext);

      await plugin.initialize(sandboxedContext);
      this._initializedPlugins.add(id);

      this._context.diagnostics.recordInitialization(
        profiler.durationMs,
        true,
      );
    } catch (err) {
      this._context.diagnostics.recordInitialization(
        profiler.durationMs,
        false,
      );
      throw err;
    }
  }

  public async shutdownPlugin(id: string, plugin: Plugin): Promise<void> {
    if (this._shutdownPlugins.has(id)) {
      throw new PluginValidationError(
        `PluginInitializer: Plugin "${id}" has already been shut down.`,
      );
    }

    const profiler = new PluginProfiler();
    profiler.start();

    try {
      await plugin.shutdown();
      this._shutdownPlugins.add(id);
      this._context.diagnostics.recordShutdown(profiler.durationMs, true);
    } catch (err) {
      this._context.diagnostics.recordShutdown(profiler.durationMs, false);
      throw err;
    }
  }
}
