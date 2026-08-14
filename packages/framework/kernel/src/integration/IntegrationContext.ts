import { KernelRegistry } from '../registry/KernelRegistry';

export class IntegrationContext {
  public readonly registry = new KernelRegistry();
  public readonly data = new Map<string, unknown>();
}
