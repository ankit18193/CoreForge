import type { HttpBindingContext } from '@coreforge/contracts';

import { HttpBindingPlan } from './HttpBindingPlan';
import { HttpBindingRegistry } from './HttpBindingRegistry';
import { HttpValueExtractor } from './HttpValueExtractor';

export class HttpBindingResolver {
  private readonly _registry: HttpBindingRegistry;

  constructor(registry?: HttpBindingRegistry) {
    this._registry = registry ?? new HttpBindingRegistry();
  }

  public get registry(): HttpBindingRegistry {
    return this._registry;
  }

  public resolvePlan(id: string): HttpBindingPlan | undefined {
    return this._registry.get(id);
  }

  /**
   * Extract raw values from the request context according to the binding plan.
   */
  public extractValues<TReq = unknown>(
    plan: HttpBindingPlan,
    context: HttpBindingContext<TReq>,
  ): Record<string, unknown> {
    const rawValues: Record<string, unknown> = {};

    for (const def of plan.definitions) {
      const extracted = HttpValueExtractor.extract(context.request, def, context.parameters);

      if (extracted !== undefined) {
        rawValues[def.target] = extracted;
      } else if (def.defaultValue !== undefined) {
        rawValues[def.target] = def.defaultValue;
      }
    }

    return rawValues;
  }
}
