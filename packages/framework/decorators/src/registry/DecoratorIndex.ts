import { MetadataType } from '@coreforge/contracts';

import { DecoratorRegistration } from './DecoratorRegistration';

export class DecoratorIndex {
  private readonly _byId = new Map<string, DecoratorRegistration>();
  private readonly _byType = new Map<MetadataType, Set<string>>();
  private readonly _byTarget = new Map<string, Set<string>>();
  private readonly _byParentId = new Map<string, Set<string>>();

  public index(registration: DecoratorRegistration): void {
    this._byId.set(registration.id, registration);

    let typeSet = this._byType.get(registration.type);
    if (!typeSet) {
      typeSet = new Set<string>();
      this._byType.set(registration.type, typeSet);
    }
    typeSet.add(registration.id);

    let targetSet = this._byTarget.get(registration.target);
    if (!targetSet) {
      targetSet = new Set<string>();
      this._byTarget.set(registration.target, targetSet);
    }
    targetSet.add(registration.id);

    if (registration.parentId) {
      let parentSet = this._byParentId.get(registration.parentId);
      if (!parentSet) {
        parentSet = new Set<string>();
        this._byParentId.set(registration.parentId, parentSet);
      }
      parentSet.add(registration.id);
    }
  }

  public getById(id: string): DecoratorRegistration | undefined {
    return this._byId.get(id);
  }

  public getByType(type: MetadataType): readonly DecoratorRegistration[] {
    const ids = this._byType.get(type);
    if (!ids) {
      return [];
    }
    const result: DecoratorRegistration[] = [];
    for (const id of ids) {
      const reg = this._byId.get(id);
      if (reg) {
        result.push(reg);
      }
    }
    return result;
  }

  public getByTarget(target: string): readonly DecoratorRegistration[] {
    const ids = this._byTarget.get(target);
    if (!ids) {
      return [];
    }
    const result: DecoratorRegistration[] = [];
    for (const id of ids) {
      const reg = this._byId.get(id);
      if (reg) {
        result.push(reg);
      }
    }
    return result;
  }

  public getByParentId(parentId: string): readonly DecoratorRegistration[] {
    const ids = this._byParentId.get(parentId);
    if (!ids) {
      return [];
    }
    const result: DecoratorRegistration[] = [];
    for (const id of ids) {
      const reg = this._byId.get(id);
      if (reg) {
        result.push(reg);
      }
    }
    return result;
  }

  public getAll(): readonly DecoratorRegistration[] {
    return Array.from(this._byId.values());
  }

  public has(id: string): boolean {
    return this._byId.has(id);
  }

  public clear(): void {
    this._byId.clear();
    this._byType.clear();
    this._byTarget.clear();
    this._byParentId.clear();
  }
}
