import { AssemblerOptions } from './AssemblerOptions';
import { AssemblyCache } from '../cache/AssemblyCache';

export class AssemblerConfiguration {
  public readonly cache: AssemblyCache;

  constructor(options: AssemblerOptions) {
    this.cache = options.cache || new AssemblyCache();
    Object.freeze(this);
  }
}
