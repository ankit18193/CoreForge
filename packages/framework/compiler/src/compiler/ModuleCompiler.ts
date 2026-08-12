import {
  CompilationResult,
  DiscoveryResult,
  ModuleCompiler as IModuleCompiler,
} from '@coreforge/contracts';

import { CompilerConfiguration } from './CompilerConfiguration';
import { CompilerDiagnostics } from '../diagnostics/CompilerDiagnostics';
import { CompilerProfiler } from '../internal/CompilerProfiler';
import { CompilerLifecycleManager } from '../lifecycle/CompilerLifecycleManager';
import { CompilerState } from '../lifecycle/CompilerState';
import { ApplicationModel } from '../model/ApplicationModel';
import { DependencyOptimizer } from '../optimizer/DependencyOptimizer';
import { MetadataOptimizer } from '../optimizer/MetadataOptimizer';
import { ProviderOptimizer } from '../optimizer/ProviderOptimizer';
import { RouteOptimizer } from '../optimizer/RouteOptimizer';
import { CompilationContext } from '../planner/CompilationContext';
import { CompilationPlanner } from '../planner/CompilationPlanner';
import { CompilationValidator } from '../validator/CompilationValidator';

export class ModuleCompiler implements IModuleCompiler {
  private readonly _config: CompilerConfiguration;
  private readonly _lifecycle = new CompilerLifecycleManager();
  private readonly _diagnostics = new CompilerDiagnostics();

  constructor(config: CompilerConfiguration) {
    this._config = config;
  }

  public get state(): CompilerState {
    return this._lifecycle.state;
  }

  public get diagnostics(): CompilerDiagnostics {
    return this._diagnostics;
  }

  public async compile(discovery: DiscoveryResult): Promise<CompilationResult> {
    const cached = this._config.cache.getModel();
    if (cached) {
      this._diagnostics.recordCounts(
        cached.modules.length,
        cached.providers.length,
        cached.controllers.length,
        cached.routes.length,
        cached.middleware.length,
        cached.interceptors.length,
      );
      return { application: cached };
    }

    const totalProfiler = new CompilerProfiler();
    totalProfiler.start();

    this._lifecycle.transitionTo(CompilerState.PLANNING);

    const context = new CompilationContext(discovery);
    const planner = new CompilationPlanner();
    const plan = planner.plan(context);

    this._lifecycle.transitionTo(CompilerState.VALIDATING);
    const valProfiler = new CompilerProfiler();
    valProfiler.start();

    try {
      const validator = new CompilationValidator();
      validator.validate(discovery);
    } catch (err) {
      this._diagnostics.recordFailure();
      this._lifecycle.transitionTo(CompilerState.FAILED);
      throw err;
    }
    const valTime = valProfiler.durationMs;

    this._lifecycle.transitionTo(CompilerState.OPTIMIZING);
    const optProfiler = new CompilerProfiler();
    optProfiler.start();

    const depSavings = new DependencyOptimizer().optimize(discovery.graph).savingsCount;
    const routeOpt = new RouteOptimizer().optimize(discovery.routes);
    const provOpt = new ProviderOptimizer().optimize(discovery.providers);
    const metaOpt = new MetadataOptimizer().optimize(discovery.middleware);

    const totalSavings = depSavings + routeOpt.savings + provOpt.savings + metaOpt.savings;
    const optTime = optProfiler.durationMs;

    const appModel = new ApplicationModel({
      modules: plan.modules,
      controllers: plan.controllers,
      providers: plan.providers,
      routes: plan.routes,
      middleware: discovery.middleware.map((m) => m),
      interceptors: discovery.interceptors.map((i) => i),
      security: discovery.security.map((s) => s),
    });

    this._config.cache.cacheModel(appModel);

    this._lifecycle.transitionTo(CompilerState.COMPILED);

    this._diagnostics.recordTimings(totalProfiler.durationMs, optTime, valTime);
    this._diagnostics.recordCounts(
      plan.modules.length,
      plan.providers.length,
      plan.controllers.length,
      plan.routes.length,
      discovery.middleware.length,
      discovery.interceptors.length,
    );
    this._diagnostics.recordSavings(totalSavings);
    this._diagnostics.recordGraphMetrics(discovery.graph.size);

    return { application: appModel };
  }
}
