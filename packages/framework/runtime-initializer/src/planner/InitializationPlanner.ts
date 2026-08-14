import { RuntimeAssembly } from '@coreforge/contracts';

export interface InitializationPlan {
  readonly modules: readonly unknown[];
  readonly providers: readonly unknown[];
  readonly controllers: readonly unknown[];
  readonly routes: readonly unknown[];
  readonly middleware: readonly unknown[];
  readonly interceptors: readonly unknown[];
  readonly security: readonly unknown[];
}

export class InitializationPlanner {
  public plan(assembly: RuntimeAssembly): InitializationPlan {
    return {
      modules: [...assembly.modules],
      providers: [...assembly.providers],
      controllers: [...assembly.controllers],
      routes: [...assembly.routes],
      middleware: [...assembly.middleware],
      interceptors: [...assembly.interceptors],
      security: [...assembly.security],
    };
  }
}
