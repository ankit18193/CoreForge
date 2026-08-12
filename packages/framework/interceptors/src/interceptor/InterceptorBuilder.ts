import { Interceptor } from '@coreforge/contracts';

import { InterceptorConfiguration } from './InterceptorConfiguration';
import { InterceptorRegistry } from '../registry/InterceptorRegistry';
import { InterceptorRegistryManager } from '../registry/InterceptorRegistryManager';
import { InterceptorScope } from '../registry/InterceptorScope';

export class InterceptorBuilder {
  private readonly _registry = new InterceptorRegistry();
  private readonly _manager = new InterceptorRegistryManager(this._registry);

  public register(
    id: string,
    interceptor: Interceptor,
    scope: InterceptorScope,
    priority = 100,
  ): this {
    this._manager.register({ id, interceptor, scope, priority });
    return this;
  }

  public build(): InterceptorConfiguration {
    return new InterceptorConfiguration({
      registry: this._registry,
    });
  }
}
