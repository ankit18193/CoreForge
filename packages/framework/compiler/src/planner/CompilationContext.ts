import { DiscoveryResult } from '@coreforge/contracts';

export class CompilationContext {
  public readonly discovery: DiscoveryResult;
  public readonly data = new Map<string, unknown>();

  constructor(discovery: DiscoveryResult) {
    this.discovery = discovery;
  }
}
