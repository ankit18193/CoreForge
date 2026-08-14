import { PluginExecutionContext } from './PluginExecutionContext';
import { PluginProfiler } from '../internal/PluginProfiler';
import { PluginState } from '../lifecycle/PluginState';
import { PluginDescriptor } from '../registry/PluginDescriptor';

export class PluginRegistrar {
  private readonly _context: PluginExecutionContext;

  constructor(context: PluginExecutionContext) {
    this._context = context;
  }

  public register(desc: PluginDescriptor): void {
    const profiler = new PluginProfiler();
    profiler.start();

    this._context.registryManager.register(desc);

    if (this._context.lifecycle.state === PluginState.CREATED) {
      this._context.lifecycle.transitionTo(PluginState.REGISTERED);
      this._context.diagnostics.recordTransition();
    }

    this._context.diagnostics.recordRegistration(
      profiler.durationMs,
      this._context.registryManager.getRegistered().length,
    );
  }
}
