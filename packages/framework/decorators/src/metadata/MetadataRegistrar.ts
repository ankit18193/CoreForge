import { MetadataDescriptor, MetadataType } from '@coreforge/contracts';
import { MetadataRegistry } from '@coreforge/metadata';

import { MetadataIdGenerator } from './MetadataIdGenerator';
import { DecoratorMetadataCollector } from '../registry/DecoratorMetadataCollector';
import { DecoratorRegistration } from '../registry/DecoratorRegistration';
import {
  RouteDecoratorValidator,
  RouteValidationItem,
} from '../validation/RouteDecoratorValidator';

export interface FinalizeOptions {
  readonly strictHierarchy?: boolean;
}

export class MetadataRegistrar {
  private static _activeCollector: DecoratorMetadataCollector = new DecoratorMetadataCollector();

  public static getCollector(): DecoratorMetadataCollector {
    return this._activeCollector;
  }

  public static setCollector(collector: DecoratorMetadataCollector): void {
    this._activeCollector = collector;
  }

  public static createIsolated(): DecoratorMetadataCollector {
    return new DecoratorMetadataCollector();
  }

  public static reset(): void {
    this._activeCollector = new DecoratorMetadataCollector();
  }

  public static runWithCollector<T>(collector: DecoratorMetadataCollector, fn: () => T): T {
    const previous = this._activeCollector;
    this._activeCollector = collector;
    try {
      return fn();
    } finally {
      this._activeCollector = previous;
    }
  }

  public static finalize(
    collector: DecoratorMetadataCollector = MetadataRegistrar.getCollector(),
    targetRegistry?: MetadataRegistry,
    options: FinalizeOptions = {},
  ): readonly MetadataDescriptor[] {
    const start = Date.now();
    const registrations = collector.getAll();

    const modules = registrations.filter((r) => r.type === MetadataType.MODULE);
    const controllers = registrations.filter((r) => r.type === MetadataType.CONTROLLER);
    const actions = registrations.filter((r) => r.type === MetadataType.ACTION);
    const routes = registrations.filter((r) => r.type === MetadataType.ROUTE);
    const params = registrations.filter((r) => r.type === MetadataType.PARAMETER);
    const providers = registrations.filter((r) => r.type === MetadataType.PROVIDER);
    const middlewares = registrations.filter((r) => r.type === MetadataType.MIDDLEWARE);
    const interceptors = registrations.filter((r) => r.type === MetadataType.INTERCEPTOR);
    const securities = registrations.filter((r) => r.type === MetadataType.SECURITY);

    // Map controllers and providers to parent modules
    const controllerParentMap = new Map<string, string>();
    const providerParentMap = new Map<string, string>();

    for (const mod of modules) {
      const modControllers = (mod.properties['controllers'] || []) as (
        { name?: string } | string
      )[];
      for (const ctrl of modControllers) {
        const ctrlName =
          typeof ctrl === 'function'
            ? (ctrl as { name: string }).name
            : typeof ctrl === 'object' && ctrl !== null
              ? ctrl.name || 'Controller'
              : String(ctrl);
        controllerParentMap.set(ctrlName, mod.id);
      }

      const modProviders = (mod.properties['providers'] || []) as (
        { name?: string; serviceToken?: string } | string
      )[];
      for (const prov of modProviders) {
        const provName =
          typeof prov === 'function'
            ? (prov as { name: string }).name
            : typeof prov === 'object' && prov !== null
              ? prov.serviceToken || prov.name || 'Provider'
              : String(prov);
        providerParentMap.set(provName, mod.id);
      }
    }

    // Default module fallback if single module exists
    const defaultModuleId = modules.length === 1 ? modules[0].id : undefined;

    const finalizedDescriptors: MetadataDescriptor[] = [];

    // 1. Modules
    for (const m of modules) {
      const desc = {
        id: m.id,
        type: MetadataType.MODULE,
        name: (m.properties['name'] as string) || m.target,
        dependencies: (m.properties['dependencies'] as string[]) || [],
      };
      finalizedDescriptors.push(desc);
    }

    // 2. Controllers
    const controllerMap = new Map<string, DecoratorRegistration>();
    for (const c of controllers) {
      controllerMap.set(c.target, c);
      let parentId = c.parentId || controllerParentMap.get(c.target) || defaultModuleId;
      if (!parentId && options.strictHierarchy && modules.length > 0) {
        parentId = modules[0].id;
      }

      const desc = {
        id: c.id,
        type: MetadataType.CONTROLLER,
        parentId,
        name: (c.properties['name'] as string) || c.target,
        path: (c.properties['path'] as string) || '/',
      };
      finalizedDescriptors.push(desc);
    }

    // 3. Providers
    for (const p of providers) {
      const token = (p.properties['serviceToken'] as string) || p.target;
      let parentId =
        p.parentId ||
        providerParentMap.get(p.target) ||
        providerParentMap.get(token) ||
        defaultModuleId;
      if (!parentId && options.strictHierarchy && modules.length > 0) {
        parentId = modules[0].id;
      }

      const desc = {
        id: p.id,
        type: MetadataType.PROVIDER,
        parentId,
        serviceToken: token,
        scope: (p.properties['scope'] as string) || 'SINGLETON',
      };
      finalizedDescriptors.push(desc);
    }

    // 4. Actions
    const actionMap = new Map<string, DecoratorRegistration>();
    for (const a of actions) {
      const ctrl = controllerMap.get(a.target);
      const parentId = a.parentId || (ctrl ? ctrl.id : undefined);

      const actionKey = `${a.target}:${a.propertyKey ? String(a.propertyKey) : (a.properties['name'] as string)}`;
      actionMap.set(actionKey, a);

      const desc = {
        id: a.id,
        type: MetadataType.ACTION,
        parentId,
        name: (a.properties['name'] as string) || String(a.propertyKey),
      };
      finalizedDescriptors.push(desc);
    }

    // 5. Routes (deferred path combining and cross-declaration collision validation)
    const routeValidationList: RouteValidationItem[] = [];
    for (const r of routes) {
      const ctrl = controllerMap.get(r.target);
      const actionKey = `${r.target}:${r.propertyKey ? String(r.propertyKey) : (r.properties['actionName'] as string)}`;
      const act = actionMap.get(actionKey);

      // Route parentId links to controller for runtime dependency graph
      const parentId = ctrl ? ctrl.id : r.parentId;
      const ctrlPrefix = ctrl ? (ctrl.properties['path'] as string) || '/' : '/';
      const actionPath = (r.properties['path'] as string) || '/';
      const fullPath = MetadataIdGenerator.combinePaths(ctrlPrefix, actionPath);
      const method = ((r.properties['method'] as string) || 'GET').toUpperCase();

      const routeItem: RouteValidationItem = {
        id: r.id,
        method,
        path: fullPath,
        controllerName: r.target,
        actionName: act ? (act.properties['name'] as string) : String(r.propertyKey),
      };
      routeValidationList.push(routeItem);

      const desc = {
        id: r.id,
        type: MetadataType.ROUTE,
        parentId,
        path: fullPath,
        method,
        actionId: act ? act.id : undefined,
        actionName: act ? (act.properties['name'] as string) : String(r.propertyKey),
      };
      finalizedDescriptors.push(desc);
    }

    // Run cross-declaration validation on all routes
    collector.profiler.recordValidation(Date.now() - start);
    RouteDecoratorValidator.validateNoCollisions(routeValidationList);

    // 6. Parameters
    for (const p of params) {
      const actionKey = `${p.target}:${p.propertyKey ? String(p.propertyKey) : ''}`;
      const act = actionMap.get(actionKey);
      const parentId = p.parentId || (act ? act.id : undefined);

      const desc = {
        id: p.id,
        type: MetadataType.PARAMETER,
        parentId,
        name: (p.properties['name'] as string) || undefined,
        source: ((p.properties['source'] as string) || 'PARAM').toUpperCase(),
        index: (p.properties['index'] as number) ?? 0,
        required: (p.properties['required'] as boolean) ?? false,
      };
      finalizedDescriptors.push(desc);
    }

    // 7. Middlewares
    for (const m of middlewares) {
      let parentId = m.parentId;
      if (!parentId) {
        const ctrl = controllerMap.get(m.target);
        parentId = ctrl ? ctrl.id : undefined;
      }

      const desc = {
        id: m.id,
        type: MetadataType.MIDDLEWARE,
        parentId,
        middleware: m.properties['middleware'],
        middlewareName: (m.properties['middlewareName'] as string) || 'Middleware',
      };
      finalizedDescriptors.push(desc);
    }

    // 8. Interceptors
    for (const i of interceptors) {
      let parentId = i.parentId;
      if (!parentId) {
        const ctrl = controllerMap.get(i.target);
        parentId = ctrl ? ctrl.id : undefined;
      }

      const desc = {
        id: i.id,
        type: MetadataType.INTERCEPTOR,
        parentId,
        interceptor: i.properties['interceptor'],
        interceptorName: (i.properties['interceptorName'] as string) || 'Interceptor',
      };
      finalizedDescriptors.push(desc);
    }

    // 9. Security
    for (const s of securities) {
      let parentId = s.parentId;
      if (!parentId) {
        const ctrl = controllerMap.get(s.target);
        parentId = ctrl ? ctrl.id : undefined;
      }

      const desc = {
        id: s.id,
        type: MetadataType.SECURITY,
        parentId,
        roles: (s.properties['roles'] as string[]) || [],
        permissions: (s.properties['permissions'] as string[]) || [],
        policy: s.properties['policy'],
      };
      finalizedDescriptors.push(desc);
    }

    // Lock collector as READY
    collector.makeReady();
    collector.profiler.recordFinalization(Date.now() - start);

    // Register into target MetadataRegistry if provided
    if (targetRegistry) {
      for (const desc of finalizedDescriptors) {
        targetRegistry.register(desc);
      }
    }

    return Object.freeze(finalizedDescriptors);
  }
}
