import { ParameterValueExtractor } from './ParameterValueExtractor';
import { ParameterBindingError } from '../errors/ParameterBindingErrors';
import { NormalizedRequest, ParameterBindingDescriptor } from '../types/parameterBindingTypes';

export class ParameterBinder {
  public bind(descriptor: ParameterBindingDescriptor, request: NormalizedRequest): unknown {
    const value = ParameterValueExtractor.extract(descriptor.source, descriptor.name, request);

    // Strict missing value semantics: ONLY undefined is treated as missing.
    // false, 0, "", null are valid extracted values.
    if (descriptor.required && value === undefined) {
      const paramLabel = descriptor.name
        ? `"${descriptor.name}"`
        : `at index ${descriptor.parameterIndex}`;
      throw new ParameterBindingError(
        `Failed to bind required parameter ${paramLabel} from source ${descriptor.source} on action "${descriptor.actionId}": value was undefined.`,
        'CF-BINDING-MISSING-REQUIRED',
        {
          actionId: descriptor.actionId,
          parameterIndex: descriptor.parameterIndex,
          source: descriptor.source,
          name: descriptor.name,
        },
      );
    }

    return value;
  }
}
