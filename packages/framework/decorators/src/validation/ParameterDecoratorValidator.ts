import { DecoratorValidator } from './DecoratorValidator';
import { DecoratorValidationError } from '../errors/DecoratorErrors';

export class ParameterDecoratorValidator {
  public static validateParameter(
    target: unknown,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
    decoratorName: string,
  ): void {
    DecoratorValidator.validateMethodTarget(target, propertyKey, decoratorName);

    if (
      typeof parameterIndex !== 'number' ||
      !Number.isInteger(parameterIndex) ||
      parameterIndex < 0
    ) {
      throw new DecoratorValidationError(
        `@${decoratorName}: Invalid parameter index "${parameterIndex}". Parameter index must be a non-negative integer.`,
      );
    }
  }
}
