import { InitializedRuntime } from '@coreforge/contracts';

import { RuntimeRegistry } from '../registry/RuntimeRegistry';

export class RuntimeBuilder {
  public build(registry: RuntimeRegistry): InitializedRuntime {
    const runtime = {
      modules: registry.modules,
      providers: registry.providers,
      controllers: registry.controllers,
      routes: registry.routes,
      middleware: registry.middleware,
      interceptors: registry.interceptors,
      security: registry.security,
    };

    Object.freeze(runtime.modules);
    Object.freeze(runtime.providers);
    Object.freeze(runtime.controllers);
    Object.freeze(runtime.routes);
    Object.freeze(runtime.middleware);
    Object.freeze(runtime.interceptors);
    Object.freeze(runtime.security);
    Object.freeze(runtime);

    return runtime;
  }
}
