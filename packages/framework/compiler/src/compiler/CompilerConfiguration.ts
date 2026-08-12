import { CompilerOptions } from './CompilerOptions';
import { CompilationCache } from '../cache/CompilationCache';

export class CompilerConfiguration {
  public readonly cache: CompilationCache;

  constructor(options: CompilerOptions) {
    this.cache = options.cache;
    Object.freeze(this);
  }
}
