import { RoutePrecedenceCalculator } from '../compiler/RoutePrecedenceCalculator';
import { RouteConflictError } from '../errors/RoutingErrors';
import { CompiledRouteSegment, InternalCompiledRoute } from '../types/routingTypes';

export class RouteRegistry {
  private readonly _routes: InternalCompiledRoute[] = [];
  private readonly _byId = new Map<string, InternalCompiledRoute>();
  private _registrationCounter = 0;

  public register(route: InternalCompiledRoute): this {
    if (!route || typeof route !== 'object') {
      throw new RouteConflictError('Cannot register invalid route object.');
    }

    // 1. Duplicate ID check
    if (this._byId.has(route.id)) {
      throw new RouteConflictError(`Route with id '${route.id}' is already registered.`, {
        id: route.id,
      });
    }

    // 2. Exact or Ambiguous pattern conflict check against existing routes
    for (const existing of this._routes) {
      if (existing.method === route.method) {
        if (this._arePatternsConflicting(existing.compiledSegments, route.compiledSegments)) {
          throw new RouteConflictError(
            `Route [${route.method}] '${route.path}' conflicts with existing route '${existing.id}' [${existing.method}] '${existing.path}'.`,
            {
              incoming: { id: route.id, method: route.method, path: route.path },
              existing: { id: existing.id, method: existing.method, path: existing.path },
            },
          );
        }
      }
    }

    this._byId.set(route.id, route);
    this._routes.push(route);
    this._registrationCounter++;

    // 3. Sort all routes deterministically by precedence
    this._sortRoutes();

    return this;
  }

  public registerMany(routes: readonly InternalCompiledRoute[]): this {
    for (const r of routes) {
      this.register(r);
    }
    return this;
  }

  public get(id: string): InternalCompiledRoute | undefined {
    return this._byId.get(id);
  }

  public has(id: string): boolean {
    return this._byId.has(id);
  }

  public list(): readonly InternalCompiledRoute[] {
    return Object.freeze([...this._routes]);
  }

  public clear(): void {
    this._routes.length = 0;
    this._byId.clear();
  }

  private _sortRoutes(): void {
    this._routes.sort((a, b) => {
      const cmp = RoutePrecedenceCalculator.compare(a.precedenceVector, b.precedenceVector);
      if (cmp !== 0) {
        return cmp;
      }
      return a.id.localeCompare(b.id);
    });
  }

  private _arePatternsConflicting(
    a: readonly CompiledRouteSegment[],
    b: readonly CompiledRouteSegment[],
  ): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      const segA = a[i];
      const segB = b[i];

      if (segA.kind !== segB.kind) {
        return false;
      }

      if (segA.kind === 'STATIC' && segB.kind === 'STATIC') {
        if (segA.value !== segB.value) {
          return false;
        }
      }

      if (segA.kind === 'PARAM' && segB.kind === 'PARAM') {
        // If both are unconstrained or have the same constraint string, they collide
        if (segA.constraint !== segB.constraint) {
          return false;
        }
      }
    }

    return true;
  }
}
