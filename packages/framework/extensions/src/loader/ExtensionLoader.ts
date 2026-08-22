import { ExtensionExecutionContext } from './ExtensionExecutionContext';
import { ExtensionResolver } from './ExtensionResolver';
import { ExtensionLoadError } from '../errors/ExtensionErrors';
import { ExtensionProfiler } from '../internal/ExtensionProfiler';
import { ExtensionState } from '../lifecycle/ExtensionState';

export class ExtensionLoader {
  private readonly _context: ExtensionExecutionContext;
  private readonly _resolver = new ExtensionResolver();

  constructor(context: ExtensionExecutionContext) {
    this._context = context;
  }

  public async load(): Promise<void> {
    this._context.lifecycle.transitionTo(ExtensionState.LOADING);
    this._context.diagnostics.recordTransition();

    const profiler = new ExtensionProfiler();
    profiler.start();

    try {
      const registered = this._context.extensionRegistry.getRegistered();

      const resProfiler = new ExtensionProfiler();
      resProfiler.start();
      const { graph, order } = this._resolver.resolve(registered);
      this._context.diagnostics.recordResolution(resProfiler.durationMs, graph.size, graph.depth);

      this._context.extensionRegistry.makeReadOnly();

      // Simulated load step
      for (const id of order) {
        this._context.extensionRegistry.enable(id);
      }

      this._context.lifecycle.transitionTo(ExtensionState.LOADED);
      this._context.diagnostics.recordTransition();

      this._context.diagnostics.recordLoad(profiler.durationMs, true);
    } catch (err: unknown) {
      this._context.lifecycle.transitionTo(ExtensionState.FAILED);
      this._context.diagnostics.recordTransition();
      this._context.diagnostics.recordLoad(profiler.durationMs, false);

      const msg = err instanceof Error ? err.message : String(err);
      throw new ExtensionLoadError(`ExtensionLoader: Loading failed: ${msg}`, {
        cause: err as Record<string, unknown>,
      });
    }
  }
}
