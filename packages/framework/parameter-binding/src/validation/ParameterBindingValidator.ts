import { ParameterBindingValidationError } from '../errors/ParameterBindingErrors';
import { ParameterBindingDescriptor, ParameterBindingSource } from '../types/parameterBindingTypes';

export class ParameterBindingValidator {
  private static readonly VALID_SOURCES: ReadonlySet<ParameterBindingSource> = new Set([
    'PARAM',
    'QUERY',
    'BODY',
    'HEADER',
    'COOKIE',
  ]);

  public static validate(descriptor: ParameterBindingDescriptor): void {
    if (descriptor.parameterIndex < 0 || !Number.isInteger(descriptor.parameterIndex)) {
      throw new ParameterBindingValidationError(
        `Invalid parameter index ${descriptor.parameterIndex} on action "${descriptor.actionId}". Parameter index must be an integer >= 0.`,
        { descriptor },
      );
    }

    if (!ParameterBindingValidator.VALID_SOURCES.has(descriptor.source)) {
      throw new ParameterBindingValidationError(
        `Invalid parameter binding source "${String(descriptor.source)}" on action "${descriptor.actionId}".`,
        { descriptor },
      );
    }

    if (descriptor.source === 'PARAM' && (!descriptor.name || descriptor.name.trim() === '')) {
      throw new ParameterBindingValidationError(
        `Route parameter binding on action "${descriptor.actionId}" at index ${descriptor.parameterIndex} requires a non-empty parameter name.`,
        { descriptor },
      );
    }

    if (
      (descriptor.source === 'HEADER' || descriptor.source === 'COOKIE') &&
      descriptor.name !== undefined &&
      descriptor.name.trim() === ''
    ) {
      throw new ParameterBindingValidationError(
        `${descriptor.source} parameter binding on action "${descriptor.actionId}" at index ${descriptor.parameterIndex} has an empty parameter name.`,
        { descriptor },
      );
    }
  }
}
