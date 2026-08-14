import { RuntimeAssembly as IRuntimeAssembly } from '@coreforge/contracts';

import { RuntimeController } from './RuntimeController';
import { RuntimeModule } from './RuntimeModule';
import { RuntimeProvider } from './RuntimeProvider';
import { RuntimeRoute } from './RuntimeRoute';

export class RuntimeAssembly implements IRuntimeAssembly {
  public readonly modules: readonly RuntimeModule[];
  public readonly providers: readonly RuntimeProvider[];
  public readonly controllers: readonly RuntimeController[];
  public readonly routes: readonly RuntimeRoute[];
  public readonly middleware: readonly unknown[];
  public readonly interceptors: readonly unknown[];
  public readonly security: readonly unknown[];
  public readonly runtimeGraph: unknown;

  constructor(params: {
    modules: readonly RuntimeModule[];
    providers: readonly RuntimeProvider[];
    controllers: readonly RuntimeController[];
    routes: readonly RuntimeRoute[];
    middleware: readonly unknown[];
    interceptors: readonly unknown[];
    security: readonly unknown[];
    runtimeGraph: unknown;
  }) {
    this.modules = params.modules;
    this.providers = params.providers;
    this.controllers = params.controllers;
    this.routes = params.routes;
    this.middleware = params.middleware;
    this.interceptors = params.interceptors;
    this.security = params.security;
    this.runtimeGraph = params.runtimeGraph;

    Object.freeze(this.modules);
    Object.freeze(this.providers);
    Object.freeze(this.controllers);
    Object.freeze(this.routes);
    Object.freeze(this.middleware);
    Object.freeze(this.interceptors);
    Object.freeze(this.security);
    Object.freeze(this);
  }
}
