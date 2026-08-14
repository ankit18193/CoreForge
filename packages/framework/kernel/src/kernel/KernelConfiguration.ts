import { KernelOptions } from './KernelOptions';

export class KernelConfiguration {
  constructor(options?: KernelOptions) {
    Object.freeze(options);
    Object.freeze(this);
  }
}
