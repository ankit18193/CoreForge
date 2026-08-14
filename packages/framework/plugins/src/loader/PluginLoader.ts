import { PluginExecutionContext } from './PluginExecutionContext';
import { PluginResolver } from './PluginResolver';
import { PluginLoadError } from '../errors/PluginErrors';
import { PluginProfiler } from '../internal/PluginProfiler';
import { PluginState } from '../lifecycle/PluginState';

export class PluginLoader {
  private readonly _context: PluginExecutionContext;
  private readonly _resolver = new PluginResolver();

  constructor(context: PluginExecutionContext) {
    this._context = context;
  }

  public async load(): Promise<string[]> {
    this._context.lifecycle.transitionTo(PluginState.LOADING);
    this._context.diagnostics.recordTransition();

    const profiler = new PluginProfiler();
    profiler.start();

    try {
      const registered = this._context.registryManager.getRegistered();

      const resProfiler = new PluginProfiler();
      resProfiler.start();
      const { graph, order } = this._resolver.resolve(registered);
      this._context.diagnostics.recordResolution(
        resProfiler.durationMs,
        graph.size,
        graph.depth,
      );

      this._context.registryManager.makeReadOnly();

      for (const id of order) {
        this._context.registryManager.enable(id);
      }

      this._context.lifecycle.transitionTo(PluginState.LOADED);
      this._context.diagnostics.recordTransition();

      this._context.diagnostics.recordLoad(profiler.durationMs, true);
      return order;
    } catch (err: unknown) {
      this._context.lifecycle.transitionTo(PluginState.FAILED);
      this._context.diagnostics.recordTransition();
      this._context.diagnostics.recordLoad(profiler.durationMs, false);

      const msg = err instanceof Error ? err.message : String(err);
      throw new PluginLoadError(`PluginLoader: Loading failed: ${msg}`, {
        cause: err as Record<string, unknown>,
      });
    }
  }
}
