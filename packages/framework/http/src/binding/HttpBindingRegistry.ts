import type { HttpBindingDefinition } from '@coreforge/contracts';

import { HttpBindingPlan } from './HttpBindingPlan';
import { HttpBindingConfigurationError } from '../errors/HttpBindingErrors';

export class HttpBindingRegistry {
  private readonly _plansById = new Map<string, HttpBindingPlan>();
  private readonly _orderedIds: string[] = [];
  private _locked = false;

  public get size(): number {
    return this._plansById.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register(
    id: string,
    definitionsOrPlan: readonly HttpBindingDefinition[] | HttpBindingPlan,
  ): void {
    if (this._locked) {
      throw new HttpBindingConfigurationError(
        'Cannot register binding plan after binding registry has been locked',
      );
    }

    if (typeof id !== 'string' || id.trim() === '') {
      throw new HttpBindingConfigurationError('Binding plan id must be a non-empty string');
    }

    const cleanId = id.trim();
    if (this._plansById.has(cleanId)) {
      throw new HttpBindingConfigurationError(
        `Binding plan with ID '${cleanId}' is already registered`,
      );
    }

    const plan =
      definitionsOrPlan instanceof HttpBindingPlan
        ? definitionsOrPlan
        : HttpBindingPlan.create(definitionsOrPlan);

    this._plansById.set(cleanId, plan);
    this._orderedIds.push(cleanId);
  }

  public get(id: string): HttpBindingPlan | undefined {
    return this._plansById.get(id);
  }

  public has(id: string): boolean {
    return this._plansById.has(id);
  }

  public list(): readonly string[] {
    return Object.freeze([...this._orderedIds]);
  }

  public lock(): void {
    this._locked = true;
  }

  public clear(): void {
    if (this._locked) {
      throw new HttpBindingConfigurationError('Cannot clear binding registry when it is locked');
    }
    this._plansById.clear();
    this._orderedIds.length = 0;
  }
}
