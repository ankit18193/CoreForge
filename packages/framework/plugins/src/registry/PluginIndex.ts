import { PluginDescriptor } from './PluginDescriptor';

export class PluginIndex {
  private readonly _index = new Map<string, PluginDescriptor>();

  public add(desc: PluginDescriptor): void {
    this._index.set(desc.id, desc);
  }

  public get(id: string): PluginDescriptor | undefined {
    return this._index.get(id);
  }

  public has(id: string): boolean {
    return this._index.has(id);
  }

  public remove(id: string): void {
    this._index.delete(id);
  }

  public getAll(): readonly PluginDescriptor[] {
    return Array.from(this._index.values());
  }

  public clear(): void {
    this._index.clear();
  }
}
