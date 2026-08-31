import type { HttpBindingDefinition } from '@coreforge/contracts';

import { HttpBindingSnapshot } from './HttpBindingSnapshot';
import { HttpBindingValidator } from './HttpBindingValidator';

export class HttpBindingPlan {
  private readonly _definitions: readonly HttpBindingDefinition[];
  private readonly _byTarget: ReadonlyMap<string, HttpBindingDefinition>;

  private constructor(definitions: readonly HttpBindingDefinition[]) {
    const validated = HttpBindingValidator.validateMany(definitions);
    const frozen = validated.map((d) => HttpBindingSnapshot.createDefinition(d));
    this._definitions = Object.freeze(frozen);

    const map = new Map<string, HttpBindingDefinition>();
    for (const def of this._definitions) {
      map.set(def.target, def);
    }
    this._byTarget = Object.freeze(map);
  }

  public static create(definitions: readonly HttpBindingDefinition[]): HttpBindingPlan {
    return new HttpBindingPlan(definitions);
  }

  public get definitions(): readonly HttpBindingDefinition[] {
    return this._definitions;
  }

  public get size(): number {
    return this._definitions.length;
  }

  public getByTarget(target: string): HttpBindingDefinition | undefined {
    return this._byTarget.get(target);
  }

  public hasTarget(target: string): boolean {
    return this._byTarget.has(target);
  }
}
