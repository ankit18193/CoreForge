import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';

export class MetadataCursor {
  private readonly _items: readonly MetadataDescriptor[];
  private _index = 0;

  constructor(items: readonly MetadataDescriptor[]) {
    this._items = items;
  }

  public hasNext(): boolean {
    return this._index < this._items.length;
  }

  public next(): MetadataDescriptor {
    if (!this.hasNext()) {
      throw new Error('MetadataCursor: No more items remaining in this cursor.');
    }
    const item = this._items[this._index];
    this._index++;
    return item;
  }

  public peek(): MetadataDescriptor | undefined {
    return this._items[this._index];
  }

  public reset(): void {
    this._index = 0;
  }

  public toArray(): readonly MetadataDescriptor[] {
    return [...this._items];
  }

  public filter(predicate: (desc: MetadataDescriptor) => boolean): MetadataCursor {
    return new MetadataCursor(this._items.filter(predicate));
  }
}
