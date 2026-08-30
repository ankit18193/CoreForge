import {
  HttpMethod,
  HttpRoute,
  HttpRouteOptions,
  HttpRouteRegistry as IHttpRouteRegistry,
} from '@coreforge/contracts';

import { HttpRouteSnapshot } from './HttpRouteSnapshot';
import { HttpRouteDuplicateError, HttpRouteRegistrationError } from '../errors/HttpRoutingErrors';

export interface RegisteredRouteEntry {
  readonly route: Readonly<HttpRoute>;
  readonly sequence: number;
}

export class HttpRouteRegistry implements IHttpRouteRegistry {
  private readonly _routesById = new Map<string, RegisteredRouteEntry>();
  private readonly _routesList: RegisteredRouteEntry[] = [];
  private readonly _routesByMethod = new Map<HttpMethod, RegisteredRouteEntry[]>();
  private _locked = false;
  private _sequenceCounter = 0;

  public get size(): number {
    return this._routesById.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register(route: HttpRoute, options?: HttpRouteOptions): void {
    if (this._locked) {
      throw new HttpRouteRegistrationError(
        'Cannot register routes after route registry has been locked',
      );
    }

    const routeToSnapshot: HttpRoute = {
      id: route.id,
      method: route.method,
      path: route.path,
      operation: route.operation,
      priority: options?.priority ?? route.priority,
      metadata: options?.metadata ?? route.metadata,
    };

    const snapshot = HttpRouteSnapshot.create(routeToSnapshot);

    if (this._routesById.has(snapshot.id)) {
      throw new HttpRouteDuplicateError(snapshot.id);
    }

    const sequence = ++this._sequenceCounter;
    const entry: RegisteredRouteEntry = Object.freeze({
      route: snapshot,
      sequence,
    });

    this._routesById.set(snapshot.id, entry);
    this._routesList.push(entry);

    const methodRoutes = this._routesByMethod.get(snapshot.method) ?? [];
    methodRoutes.push(entry);
    this._routesByMethod.set(snapshot.method, methodRoutes);
  }

  public get(routeId: string): Readonly<HttpRoute> | undefined {
    return this._routesById.get(routeId)?.route;
  }

  public getEntry(routeId: string): RegisteredRouteEntry | undefined {
    return this._routesById.get(routeId);
  }

  public list(): readonly Readonly<HttpRoute>[] {
    return Object.freeze(this._routesList.map((e) => e.route));
  }

  public listEntries(): readonly RegisteredRouteEntry[] {
    return Object.freeze([...this._routesList]);
  }

  public getByMethod(method: HttpMethod): readonly RegisteredRouteEntry[] {
    const entries = this._routesByMethod.get(method) ?? [];
    return Object.freeze([...entries]);
  }

  public lock(): void {
    this._locked = true;
  }
}
