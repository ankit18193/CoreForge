import { DependencyValidator } from './DependencyValidator';
import { DuplicateValidator } from './DuplicateValidator';
import { RegistrationConsistencyValidator } from './RegistrationConsistencyValidator';
import { RegistrationRegistry } from '../registry/RegistrationRegistry';

export class RegistrationValidator {
  private readonly _duplicate = new DuplicateValidator();
  private readonly _dependency = new DependencyValidator();
  private readonly _consistency = new RegistrationConsistencyValidator();

  public validate(registry: RegistrationRegistry): void {
    this._duplicate.validate(registry);
    this._dependency.validate(registry);
    this._consistency.validate(registry);
  }
}
