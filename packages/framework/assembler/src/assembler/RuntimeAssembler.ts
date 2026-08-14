import {
  AssemblyResult,
  ScanResult,
  RuntimeAssembler as IRuntimeAssembler,
} from '@coreforge/contracts';

import { AssemblerConfiguration } from './AssemblerConfiguration';
import { ControllerAssembler } from '../assembler-components/ControllerAssembler';
import { InterceptorAssembler } from '../assembler-components/InterceptorAssembler';
import { MiddlewareAssembler } from '../assembler-components/MiddlewareAssembler';
import { ModuleAssembler } from '../assembler-components/ModuleAssembler';
import { ProviderAssembler } from '../assembler-components/ProviderAssembler';
import { RouteAssembler } from '../assembler-components/RouteAssembler';
import { SecurityAssembler } from '../assembler-components/SecurityAssembler';
import { AssemblyDiagnostics } from '../diagnostics/AssemblyDiagnostics';
import { RuntimeGraphBuilder } from '../graph/RuntimeGraphBuilder';
import { RuntimeGraphValidator } from '../graph/RuntimeGraphValidator';
import { AssemblyProfiler } from '../internal/AssemblyProfiler';
import { AssemblyLifecycleManager } from '../lifecycle/AssemblyLifecycleManager';
import { AssemblyState } from '../lifecycle/AssemblyState';
import { RuntimeAssembly } from '../model/RuntimeAssembly';
import { AssemblyPlanner } from '../planner/AssemblyPlanner';
import { RuntimeAssemblyRegistry } from '../registry/RuntimeAssemblyRegistry';

export class RuntimeAssembler implements IRuntimeAssembler {
  private readonly _config: AssemblerConfiguration;
  private readonly _lifecycle = new AssemblyLifecycleManager();
  private readonly _diagnostics = new AssemblyDiagnostics();

  constructor(config: AssemblerConfiguration) {
    this._config = config;
  }

  public get state(): AssemblyState {
    return this._lifecycle.state;
  }

  public get diagnostics(): AssemblyDiagnostics {
    return this._diagnostics;
  }

  public get config(): AssemblerConfiguration {
    return this._config;
  }

  public async assemble(scan: ScanResult): Promise<AssemblyResult> {
    const cached = this._config.cache.getAssembly();
    if (cached) {
      this._diagnostics.recordCacheHit();
      this._diagnostics.recordCounts(
        cached.modules.length,
        cached.providers.length,
        cached.controllers.length,
        cached.routes.length,
        cached.middleware.length,
        cached.interceptors.length,
        cached.security.length,
      );
      return { runtime: cached };
    }

    this._diagnostics.recordCacheMiss();
    const totalProfiler = new AssemblyProfiler();
    totalProfiler.start();

    this._lifecycle.transitionTo(AssemblyState.PLANNING);
    const planProfiler = new AssemblyProfiler();
    planProfiler.start();

    const planner = new AssemblyPlanner();
    const orderedIds = planner.plan(scan);
    const planTime = planProfiler.durationMs;

    this._lifecycle.transitionTo(AssemblyState.ASSEMBLING);

    const graphProfiler = new AssemblyProfiler();
    graphProfiler.start();
    const graphBuilder = new RuntimeGraphBuilder();
    const graph = graphBuilder.build(scan);
    const graphTime = graphProfiler.durationMs;

    const valProfiler = new AssemblyProfiler();
    valProfiler.start();
    try {
      const validator = new RuntimeGraphValidator();
      validator.validate(graph, scan);
    } catch (err) {
      this._diagnostics.recordFailure();
      this._lifecycle.transitionTo(AssemblyState.FAILED);
      throw err;
    }
    const valTime = valProfiler.durationMs;

    const registry = new RuntimeAssemblyRegistry();
    const moduleAssembler = new ModuleAssembler();
    const providerAssembler = new ProviderAssembler();
    const controllerAssembler = new ControllerAssembler();
    const routeAssembler = new RouteAssembler();
    const middlewareAssembler = new MiddlewareAssembler();
    const interceptorAssembler = new InterceptorAssembler();
    const securityAssembler = new SecurityAssembler();

    for (const id of orderedIds) {
      const desc = scan.registrations.find((r) => r.id === id);
      if (desc) {
        if (desc.type === 'MODULE') {
          registry.registerModule(moduleAssembler.assemble(desc));
        } else if (desc.type === 'PROVIDER') {
          registry.registerProvider(providerAssembler.assemble(desc));
        } else if (desc.type === 'CONTROLLER') {
          registry.registerController(controllerAssembler.assemble(desc));
        } else if (desc.type === 'ROUTE') {
          registry.registerRoute(routeAssembler.assemble(desc));
        } else if (desc.type === 'MIDDLEWARE') {
          registry.registerMiddleware(middlewareAssembler.assemble(desc));
        } else if (desc.type === 'INTERCEPTOR') {
          registry.registerInterceptor(interceptorAssembler.assemble(desc));
        } else if (desc.type === 'SECURITY') {
          registry.registerSecurity(securityAssembler.assemble(desc));
        }
      }
    }

    this._lifecycle.transitionTo(AssemblyState.VALIDATING);

    const runtime = new RuntimeAssembly({
      modules: registry.modules,
      providers: registry.providers,
      controllers: registry.controllers,
      routes: registry.routes,
      middleware: registry.middleware,
      interceptors: registry.interceptors,
      security: registry.security,
      runtimeGraph: graph,
    });

    this._lifecycle.transitionTo(AssemblyState.READY);
    registry.makeReady();

    this._config.cache.cacheAssembly(runtime);

    this._diagnostics.recordTimings(
      totalProfiler.durationMs,
      planTime,
      graphTime,
      valTime,
    );
    this._diagnostics.recordCounts(
      registry.modules.length,
      registry.providers.length,
      registry.controllers.length,
      registry.routes.length,
      registry.middleware.length,
      registry.interceptors.length,
      registry.security.length,
    );
    this._diagnostics.recordGraph(graph.size, graph.getDepth());

    return { runtime };
  }
}
