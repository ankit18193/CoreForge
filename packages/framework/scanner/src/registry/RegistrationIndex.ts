import { RegistrationDescriptor } from '@coreforge/contracts';

export class RegistrationIndex {
  private readonly _index = new Map<string, RegistrationDescriptor>();

  public add(desc: RegistrationDescriptor): void {
    this._index.set(desc.id, desc);
  }

  public get(id: string): RegistrationDescriptor | undefined {
    return this._index.get(id);
  }

  public has(id: string): boolean {
    return this._index.has(id);
  }

  public clear(): void {
    this._index.clear();
  }
}
