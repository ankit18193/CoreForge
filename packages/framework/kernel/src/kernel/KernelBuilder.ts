import { KernelConfiguration } from './KernelConfiguration';

export class KernelBuilder {
  public build(): KernelConfiguration {
    return new KernelConfiguration();
  }
}
