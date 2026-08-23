import { MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { ParameterBindingDescriptor, ParameterBindingSource } from '../types/parameterBindingTypes';
import { ParameterBindingConflictValidator } from '../validation/ParameterBindingConflictValidator';
import { ParameterBindingValidator } from '../validation/ParameterBindingValidator';

export class ParameterBindingCompiler {
  public static compileFromRegistry(
    registry: MetadataRegistry,
  ): ReadonlyMap<string, readonly ParameterBindingDescriptor[]> {
    const actionBindings = new Map<string, ParameterBindingDescriptor[]>();

    const items = registry.resolve(MetadataType.PARAMETER);
    for (const item of items) {
      const record = item as unknown as Record<string, unknown>;
      const actionId = item.parentId || 'unknownAction';

      const rawSource = String(record['source'] || 'PARAM').toUpperCase();
      const source = rawSource as ParameterBindingSource;
      const parameterIndex =
        typeof record['parameterIndex'] === 'number'
          ? (record['parameterIndex'] as number)
          : typeof record['index'] === 'number'
            ? (record['index'] as number)
            : 0;
      const name = record['name'] !== undefined ? String(record['name']) : undefined;
      const required =
        record['required'] !== undefined
          ? Boolean(record['required'])
          : source === 'PARAM' || source === 'HEADER' || (source === 'BODY' && name !== undefined);

      const descriptor: ParameterBindingDescriptor = Object.freeze({
        id: item.id,
        actionId,
        parameterIndex,
        source,
        name,
        required,
      });

      ParameterBindingValidator.validate(descriptor);

      if (!actionBindings.has(actionId)) {
        actionBindings.set(actionId, []);
      }
      actionBindings.get(actionId)!.push(descriptor);
    }

    const compiledMap = new Map<string, readonly ParameterBindingDescriptor[]>();
    for (const [actionId, descriptors] of actionBindings.entries()) {
      ParameterBindingConflictValidator.validate(descriptors);
      const sorted = [...descriptors].sort((a, b) => a.parameterIndex - b.parameterIndex);
      compiledMap.set(actionId, Object.freeze(sorted));
    }

    return Object.freeze(compiledMap);
  }

  public static compileDescriptors(
    descriptors: readonly ParameterBindingDescriptor[],
  ): readonly ParameterBindingDescriptor[] {
    for (const desc of descriptors) {
      ParameterBindingValidator.validate(desc);
    }
    ParameterBindingConflictValidator.validate(descriptors);

    const sorted = [...descriptors].sort((a, b) => a.parameterIndex - b.parameterIndex);
    return Object.freeze(sorted);
  }
}
