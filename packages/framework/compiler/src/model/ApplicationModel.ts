import { CompilationArtifact } from '@coreforge/contracts';

import { ControllerModel } from './ControllerModel';
import { ModuleModel } from './ModuleModel';
import { ProviderModel } from './ProviderModel';
import { RouteModel } from './RouteModel';

export class ApplicationModel implements CompilationArtifact {
  public readonly modules: readonly ModuleModel[];
  public readonly controllers: readonly ControllerModel[];
  public readonly providers: readonly ProviderModel[];
  public readonly routes: readonly RouteModel[];
  public readonly middleware: readonly unknown[];
  public readonly interceptors: readonly unknown[];
  public readonly security: readonly unknown[];

  constructor(params: {
    modules: readonly ModuleModel[];
    controllers: readonly ControllerModel[];
    providers: readonly ProviderModel[];
    routes: readonly RouteModel[];
    middleware: readonly unknown[];
    interceptors: readonly unknown[];
    security: readonly unknown[];
  }) {
    this.modules = params.modules;
    this.controllers = params.controllers;
    this.providers = params.providers;
    this.routes = params.routes;
    this.middleware = params.middleware;
    this.interceptors = params.interceptors;
    this.security = params.security;
    Object.freeze(this);
  }
}
