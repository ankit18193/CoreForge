import { ParameterBindingSourceError } from '../errors/ParameterBindingErrors';
import { NormalizedRequest } from '../types/parameterBindingTypes';

export class ParamSource {
  public static extract(name: string | undefined, request: NormalizedRequest): unknown {
    if (!name) {
      throw new ParameterBindingSourceError(
        'ParamSource requires a parameter name to extract route parameters.',
      );
    }
    return request.params ? request.params[name] : undefined;
  }
}
