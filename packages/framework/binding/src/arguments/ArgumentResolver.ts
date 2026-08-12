import { ActionArguments } from './ActionArguments';
import { BindingMetadata } from '../metadata/BindingMetadata';

export class ArgumentResolver {
  public resolve(
    parameters: readonly BindingMetadata[],
    extractedValues: Record<string, unknown>,
    rawValues: Record<string, unknown>,
  ): ActionArguments {
    const positionals: unknown[] = [];
    const named: Record<string, unknown> = {};

    for (const param of parameters) {
      const val = extractedValues[param.parameterName];
      positionals.push(val);
      named[param.parameterName] = val;
    }

    return new ActionArguments(positionals, named, rawValues);
  }
}
