import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';

export class MetadataStore {
  private readonly _descriptors: MetadataDescriptor[] = [];

  public add(descriptor: MetadataDescriptor): void {
    this._descriptors.push(descriptor);
  }

  public getDescriptors(): readonly MetadataDescriptor[] {
    return this._descriptors;
  }

  public clear(): void {
    this._descriptors.length = 0;
  }
}
