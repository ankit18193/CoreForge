import { RuntimeExecutionResult } from '@coreforge/contracts';

import { RuntimeExecutionRegistry } from '../registry/RuntimeExecutionRegistry';

export class RuntimeExecutionBuilder {
  public build(registry: RuntimeExecutionRegistry, started: boolean): RuntimeExecutionResult {
    const result = {
      started,
      activeComponents: registry.getActiveComponents(),
    };

    Object.freeze(result.activeComponents);
    Object.freeze(result);

    return result as unknown as RuntimeExecutionResult;
  }
}
