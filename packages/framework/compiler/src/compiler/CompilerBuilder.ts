import { CompilerConfiguration } from './CompilerConfiguration';
import { CompilationCache } from '../cache/CompilationCache';

export class CompilerBuilder {
  private readonly _cache = new CompilationCache();

  public get cache(): CompilationCache {
    return this._cache;
  }

  public build(): CompilerConfiguration {
    return new CompilerConfiguration({
      cache: this._cache,
    });
  }
}
