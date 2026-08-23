import { ParameterBindingConflictError } from '../errors/ParameterBindingErrors';
import { ParameterBindingDescriptor } from '../types/parameterBindingTypes';

export class ParameterBindingConflictValidator {
  public static validate(descriptors: readonly ParameterBindingDescriptor[]): void {
    const seenIndices = new Map<string, number>();

    for (const desc of descriptors) {
      const key = `${desc.actionId}:${desc.parameterIndex}`;
      if (seenIndices.has(key)) {
        throw new ParameterBindingConflictError(
          `Conflicting parameter bindings on action "${desc.actionId}": multiple parameter bindings declared for parameter index ${desc.parameterIndex}.`,
          { actionId: desc.actionId, parameterIndex: desc.parameterIndex },
        );
      }
      seenIndices.set(key, desc.parameterIndex);
    }
  }
}
