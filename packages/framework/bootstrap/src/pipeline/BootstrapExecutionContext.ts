import { Container } from '@coreforge/container';

import { StartupProfiler } from '../internal/StartupProfiler';
import { FrameworkRegistry } from '../registry/FrameworkRegistry';

export class BootstrapExecutionContext {
  public readonly registry: FrameworkRegistry;
  public readonly profiler: StartupProfiler;
  private _container?: Container | undefined;

  constructor() {
    this.registry = new FrameworkRegistry();
    this.profiler = new StartupProfiler();
  }

  public get container(): Container {
    if (!this._container) {
      throw new Error('BootstrapExecutionContext: Container is not initialized yet.');
    }
    return this._container;
  }

  public setContainer(container: Container): void {
    this._container = container;
  }

  public hasContainer(): boolean {
    return this._container !== undefined;
  }
}
