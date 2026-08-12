import { MetadataType } from '@coreforge/contracts';

import { DiscoveryDescriptor } from './DiscoveryDescriptor';

export class DiscoveryRegistry {
  private readonly _items = new Map<MetadataType, DiscoveryDescriptor[]>();

  constructor() {
    const list = [
      MetadataType.MODULE,
      MetadataType.CONTROLLER,
      MetadataType.PROVIDER,
      MetadataType.ROUTE,
      MetadataType.MIDDLEWARE,
      MetadataType.INTERCEPTOR,
      MetadataType.SECURITY,
    ];
    for (const t of list) {
      this._items.set(t, []);
    }
  }

  public add(type: MetadataType, descriptor: DiscoveryDescriptor): void {
    const list = this._items.get(type) || [];
    list.push(descriptor);
    this._items.set(type, list);
  }

  public getByType(type: MetadataType): readonly DiscoveryDescriptor[] {
    return this._items.get(type) || [];
  }

  public clear(): void {
    for (const key of this._items.keys()) {
      this._items.set(key, []);
    }
  }
}
