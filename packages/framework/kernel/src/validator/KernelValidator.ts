import { DependencyValidator } from './DependencyValidator';
import { IntegrationValidator } from './IntegrationValidator';
import { LifecycleValidator } from './LifecycleValidator';
import { KernelRegistry } from '../registry/KernelRegistry';

export class KernelValidator {
  private readonly _integration = new IntegrationValidator();
  private readonly _dependency = new DependencyValidator();
  private readonly _lifecycle = new LifecycleValidator();

  public validate(registry: KernelRegistry): void {
    this._integration.validate(registry);
    this._dependency.validate(registry);
    this._lifecycle.validate(registry);
  }
}
