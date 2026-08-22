import { DecoratorTargetError, DecoratorValidationError } from '../errors/DecoratorErrors';

export class DecoratorValidator {
  public static validateTarget(target: unknown, decoratorName: string): void {
    if (target === null || target === undefined) {
      throw new DecoratorTargetError(
        `@${decoratorName} cannot be applied to null or undefined target.`,
      );
    }
  }

  public static validateClassTarget(target: unknown, decoratorName: string): void {
    DecoratorValidator.validateTarget(target, decoratorName);
    if (typeof target !== 'function') {
      throw new DecoratorTargetError(
        `@${decoratorName} can only be applied to a class constructor, but received ${typeof target}.`,
      );
    }
  }

  public static validateMethodTarget(
    target: unknown,
    propertyKey: string | symbol | undefined,
    decoratorName: string,
  ): void {
    DecoratorValidator.validateTarget(target, decoratorName);
    if (propertyKey === undefined || propertyKey === null) {
      throw new DecoratorTargetError(
        `@${decoratorName} can only be applied to a class method, but propertyKey was undefined.`,
      );
    }
    if (typeof target === 'function') {
      throw new DecoratorTargetError(
        `@${decoratorName} cannot be applied directly to a class constructor; it must be applied to an instance method.`,
      );
    }
  }

  public static validateNonEmptyString(
    value: unknown,
    fieldName: string,
    decoratorName: string,
  ): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new DecoratorValidationError(
        `@${decoratorName}: "${fieldName}" must be a non-empty string.`,
      );
    }
  }
}
