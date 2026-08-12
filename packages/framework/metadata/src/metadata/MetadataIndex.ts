import { MetadataType } from '@coreforge/contracts';

import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';

export class MetadataIndex {
  private readonly _idLookup = new Map<string, MetadataDescriptor>();
  private readonly _typeLookup = new Map<MetadataType, MetadataDescriptor[]>();
  private readonly _parentLookup = new Map<string, MetadataDescriptor[]>();

  public index(descriptor: MetadataDescriptor): void {
    this._idLookup.set(descriptor.id, descriptor);

    const typeList = this._typeLookup.get(descriptor.type) || [];
    typeList.push(descriptor);
    this._typeLookup.set(descriptor.type, typeList);

    if (descriptor.parentId) {
      const parentList = this._parentLookup.get(descriptor.parentId) || [];
      parentList.push(descriptor);
      this._parentLookup.set(descriptor.parentId, parentList);
    }
  }

  public getById(id: string): MetadataDescriptor | undefined {
    return this._idLookup.get(id);
  }

  public getByType(type: MetadataType): readonly MetadataDescriptor[] {
    return this._typeLookup.get(type) || [];
  }

  public getByParent(parentId: string): readonly MetadataDescriptor[] {
    return this._parentLookup.get(parentId) || [];
  }

  public clear(): void {
    this._idLookup.clear();
    this._typeLookup.clear();
    this._parentLookup.clear();
  }
}
