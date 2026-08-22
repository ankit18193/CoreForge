import { DecoratorValidator } from './DecoratorValidator';
import { DecoratorValidationError } from '../errors/DecoratorErrors';
import { ModuleOptions } from '../types/decoratorTypes';

export class ModuleDecoratorValidator {
  public static validateModuleTarget(target: unknown): void {
    DecoratorValidator.validateClassTarget(target, 'Module');
  }

  public static validateModuleOptions(options?: ModuleOptions): void {
    if (!options) {
      return;
    }

    if (typeof options !== 'object') {
      throw new DecoratorValidationError('@Module options must be an object if provided.');
    }

    if (options.controllers !== undefined && !Array.isArray(options.controllers)) {
      throw new DecoratorValidationError('@Module: "controllers" option must be an array.');
    }

    if (options.providers !== undefined && !Array.isArray(options.providers)) {
      throw new DecoratorValidationError('@Module: "providers" option must be an array.');
    }

    if (options.imports !== undefined && !Array.isArray(options.imports)) {
      throw new DecoratorValidationError('@Module: "imports" option must be an array.');
    }

    if (options.exports !== undefined && !Array.isArray(options.exports)) {
      throw new DecoratorValidationError('@Module: "exports" option must be an array.');
    }
  }
}
