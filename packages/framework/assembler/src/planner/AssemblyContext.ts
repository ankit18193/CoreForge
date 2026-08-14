import { ScanResult } from '@coreforge/contracts';

export class AssemblyContext {
  public readonly scan: ScanResult;
  public readonly data = new Map<string, unknown>();

  constructor(scan: ScanResult) {
    this.scan = scan;
  }
}
