import { AssemblerConfiguration } from './AssemblerConfiguration';
import { AssemblyCache } from '../cache/AssemblyCache';

export class AssemblerBuilder {
  private readonly _cache = new AssemblyCache();

  public get cache(): AssemblyCache {
    return this._cache;
  }

  public build(): AssemblerConfiguration {
    return new AssemblerConfiguration({
      cache: this._cache,
    });
  }
}
