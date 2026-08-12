import { InterceptorOptions } from './InterceptorOptions';
import { InterceptorRegistry } from '../registry/InterceptorRegistry';

export class InterceptorConfiguration {
  public readonly registry: InterceptorRegistry;

  constructor(options: InterceptorOptions) {
    this.registry = options.registry;
    Object.freeze(this);
  }
}
