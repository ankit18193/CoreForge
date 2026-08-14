import { RuntimeInitializerOptions } from './RuntimeInitializerOptions';

export class RuntimeInitializerConfiguration {
  constructor(options?: RuntimeInitializerOptions) {
    Object.freeze(options);
    Object.freeze(this);
  }
}
