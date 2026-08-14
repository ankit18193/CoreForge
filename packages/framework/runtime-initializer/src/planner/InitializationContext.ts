import { RuntimeAssembly } from '@coreforge/contracts';

export class InitializationContext {
  public readonly assembly: RuntimeAssembly;
  public readonly data = new Map<string, unknown>();

  constructor(assembly: RuntimeAssembly) {
    this.assembly = assembly;
  }
}
