import {
  ApplicationScanner as IApplicationScanner,
  CompilationResult,
  RegistrationDescriptor,
  ScanResult,
} from '@coreforge/contracts';

interface ScannedApplicationModel {
  readonly modules: readonly { id: string; name: string; dependencies: readonly string[] }[];
  readonly controllers: readonly { id: string; name: string; parentId: string }[];
  readonly providers: readonly {
    id: string;
    parentId: string;
    serviceToken: string;
    scope: string;
  }[];
  readonly routes: readonly { id: string; parentId: string; path: string; method: string }[];
  readonly middleware: readonly { id: string; parentId?: string }[];
  readonly interceptors: readonly { id: string; parentId?: string }[];
  readonly security: readonly { id: string; parentId?: string }[];
}

import { ScannerConfiguration } from './ScannerConfiguration';
import { ScannerDiagnostics } from '../diagnostics/ScannerDiagnostics';
import { RegistrationConflictError, RegistrationOrderingError } from '../errors/ScannerErrors';
import { RegistrationGraph } from '../graph/RegistrationGraph';
import { RegistrationGraphValidator } from '../graph/RegistrationGraphValidator';
import { ScannerProfiler } from '../internal/ScannerProfiler';
import { ScannerLifecycleManager } from '../lifecycle/ScannerLifecycleManager';
import { ScannerState } from '../lifecycle/ScannerState';
import { ControllerRegistrar } from '../registrar/ControllerRegistrar';
import { InterceptorRegistrar } from '../registrar/InterceptorRegistrar';
import { MiddlewareRegistrar } from '../registrar/MiddlewareRegistrar';
import { ModuleRegistrar } from '../registrar/ModuleRegistrar';
import { ProviderRegistrar } from '../registrar/ProviderRegistrar';
import { RegistrationPlanner } from '../registrar/RegistrationPlanner';
import { RouteRegistrar } from '../registrar/RouteRegistrar';
import { SecurityRegistrar } from '../registrar/SecurityRegistrar';
import { RegistrationRegistry } from '../registry/RegistrationRegistry';
import { RegistrationValidator } from '../validation/RegistrationValidator';

export class ApplicationScanner implements IApplicationScanner {
  private readonly _config: ScannerConfiguration;
  private readonly _lifecycle = new ScannerLifecycleManager();
  private readonly _diagnostics = new ScannerDiagnostics();

  constructor(config: ScannerConfiguration) {
    this._config = config;
  }

  public get config(): ScannerConfiguration {
    return this._config;
  }

  public get state(): ScannerState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ScannerDiagnostics {
    return this._diagnostics;
  }

  public async scan(compilation: CompilationResult): Promise<ScanResult> {
    const appModel = compilation.application as ScannedApplicationModel;
    if (!appModel) {
      throw new Error('ApplicationScanner: Invalid compilation result model.');
    }

    const totalProfiler = new ScannerProfiler();
    totalProfiler.start();

    this._lifecycle.transitionTo(ScannerState.SCANNING);
    const graph = new RegistrationGraph();

    for (const m of appModel.modules) {
      graph.addNode(m.id, 'MODULE', [...m.dependencies]);
    }
    for (const p of appModel.providers) {
      graph.addNode(p.id, 'PROVIDER', p.parentId ? [p.parentId] : []);
    }
    for (const c of appModel.controllers) {
      graph.addNode(c.id, 'CONTROLLER', c.parentId ? [c.parentId] : []);
    }
    for (const r of appModel.routes) {
      graph.addNode(r.id, 'ROUTE', r.parentId ? [r.parentId] : []);
    }
    for (const m of appModel.middleware as { id: string; parentId?: string }[]) {
      graph.addNode(m.id, 'MIDDLEWARE', m.parentId ? [m.parentId] : []);
    }
    for (const i of appModel.interceptors as { id: string; parentId?: string }[]) {
      graph.addNode(i.id, 'INTERCEPTOR', i.parentId ? [i.parentId] : []);
    }
    for (const s of appModel.security as { id: string; parentId?: string }[]) {
      graph.addNode(s.id, 'SECURITY', s.parentId ? [s.parentId] : []);
    }

    this._lifecycle.transitionTo(ScannerState.VALIDATING);

    try {
      const graphValidator = new RegistrationGraphValidator();
      graphValidator.validate(graph);
    } catch (err) {
      this._diagnostics.recordFailure();
      if (err instanceof RegistrationOrderingError) {
        this._diagnostics.recordOrderingConflict();
      }
      this._lifecycle.transitionTo(ScannerState.FAILED);
      throw err;
    }

    const registry = new RegistrationRegistry();
    const moduleReg = new ModuleRegistrar();
    const providerReg = new ProviderRegistrar();
    const controllerReg = new ControllerRegistrar();
    const routeReg = new RouteRegistrar();
    const middlewareReg = new MiddlewareRegistrar();
    const interceptorReg = new InterceptorRegistrar();
    const securityReg = new SecurityRegistrar();

    for (const m of appModel.modules) {
      registry.register(moduleReg.register(m));
    }
    for (const p of appModel.providers) {
      registry.register(providerReg.register(p));
    }
    for (const c of appModel.controllers) {
      registry.register(controllerReg.register(c));
    }
    for (const r of appModel.routes) {
      registry.register(routeReg.register(r));
    }
    for (const m of appModel.middleware as { id: string; parentId?: string }[]) {
      registry.register(middlewareReg.register(m));
    }
    for (const i of appModel.interceptors as { id: string; parentId?: string }[]) {
      registry.register(interceptorReg.register(i));
    }
    for (const s of appModel.security as { id: string; parentId?: string }[]) {
      registry.register(securityReg.register(s));
    }

    try {
      const val = new RegistrationValidator();
      val.validate(registry);
    } catch (err) {
      this._diagnostics.recordFailure();
      if (err instanceof RegistrationConflictError) {
        this._diagnostics.recordDuplicateAttempt();
      }
      this._lifecycle.transitionTo(ScannerState.FAILED);
      throw err;
    }
    this._lifecycle.transitionTo(ScannerState.REGISTERING);
    const planProfiler = new ScannerProfiler();
    planProfiler.start();

    const planner = new RegistrationPlanner();
    const orderedIds = planner.plan(graph);
    const planTime = planProfiler.durationMs;

    const mappedRegs: RegistrationDescriptor[] = [];
    for (const id of orderedIds) {
      const reg = registry.index.get(id);
      if (reg) {
        mappedRegs.push(reg);
      }
    }

    this._lifecycle.transitionTo(ScannerState.READY);

    const result: ScanResult = {
      registrations: mappedRegs,
    };
    Object.freeze(result.registrations);
    Object.freeze(result);

    this._diagnostics.recordTimings(totalProfiler.durationMs, planTime);
    this._diagnostics.recordGraphMetrics(graph.size, graph.getDepth());
    this._diagnostics.recordStages(5);

    return result;
  }
}
