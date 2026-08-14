import { ExtensionDescriptor } from './ExtensionDescriptor';

export class ExtensionIndex {
  private readonly _index = new Map<string, ExtensionDescriptor>();

  public add(desc: ExtensionDescriptor): void {
    this._index.set(desc.id, desc);
  }

  public get(id: string): ExtensionDescriptor | undefined {
    return this._index.get(id);
  }

  public has(id: string): boolean {
    return this._index.has(id);
  }

  public remove(id: string): void {
    this._index.delete(id);
  }

  public getAll(): readonly ExtensionDescriptor[] {
    return Array.from(this._index.values());
  }

  public clear(): void {
    this._index.clear();
  }
}
