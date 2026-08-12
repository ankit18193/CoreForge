import { DiscoveryDescriptor } from './DiscoveryDescriptor';

export class DiscoveryIndex {
  private readonly _idMap = new Map<string, DiscoveryDescriptor>();

  public index(descriptor: DiscoveryDescriptor): void {
    this._idMap.set(descriptor.id, descriptor);
  }

  public getById(id: string): DiscoveryDescriptor | undefined {
    return this._idMap.get(id);
  }

  public clear(): void {
    this._idMap.clear();
  }
}
