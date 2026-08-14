import { RuntimeAssembly } from '../model/RuntimeAssembly';

export class AssemblyCache {
  private _cachedAssembly: RuntimeAssembly | undefined = undefined;

  public getAssembly(): RuntimeAssembly | undefined {
    return this._cachedAssembly;
  }

  public cacheAssembly(assembly: RuntimeAssembly): void {
    this._cachedAssembly = assembly;
  }

  public clear(): void {
    this._cachedAssembly = undefined;
  }
}
