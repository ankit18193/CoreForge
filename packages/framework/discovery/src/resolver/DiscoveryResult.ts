import {
  DependencyGraph,
  DiscoveryResult as IDiscoveryResult,
  MetadataDescriptor,
} from '@coreforge/contracts';

export class DiscoveryResult implements IDiscoveryResult {
  public readonly graph: DependencyGraph;
  public readonly modules: readonly MetadataDescriptor[];
  public readonly controllers: readonly MetadataDescriptor[];
  public readonly providers: readonly MetadataDescriptor[];
  public readonly routes: readonly MetadataDescriptor[];
  public readonly middleware: readonly MetadataDescriptor[];
  public readonly interceptors: readonly MetadataDescriptor[];
  public readonly security: readonly MetadataDescriptor[];

  constructor(params: {
    graph: DependencyGraph;
    modules: readonly MetadataDescriptor[];
    controllers: readonly MetadataDescriptor[];
    providers: readonly MetadataDescriptor[];
    routes: readonly MetadataDescriptor[];
    middleware: readonly MetadataDescriptor[];
    interceptors: readonly MetadataDescriptor[];
    security: readonly MetadataDescriptor[];
  }) {
    this.graph = params.graph;
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
