import {
  HttpMethod,
  HttpMiddleware,
  HttpMiddlewareOptions,
  HttpRoute,
  HttpRouteMatch,
  HttpRouteOptions,
  HttpRequest,
} from '@coreforge/contracts';

import { HttpRouteRegistry } from './HttpRouteRegistry';
import { HttpRouteResolver } from './HttpRouteResolver';
import { HttpMiddlewareCoordinator } from '../middleware/HttpMiddlewareCoordinator';

export class HttpRouter {
  private readonly _registry: HttpRouteRegistry;
  private readonly _resolver: HttpRouteResolver;
  private readonly _middlewareCoordinator: HttpMiddlewareCoordinator;

  constructor(registry?: HttpRouteRegistry, middlewareCoordinator?: HttpMiddlewareCoordinator) {
    this._registry = registry ?? new HttpRouteRegistry();
    this._resolver = new HttpRouteResolver(this._registry);
    this._middlewareCoordinator = middlewareCoordinator ?? new HttpMiddlewareCoordinator();
  }

  public get registry(): HttpRouteRegistry {
    return this._registry;
  }

  public get resolver(): HttpRouteResolver {
    return this._resolver;
  }

  public get middlewareCoordinator(): HttpMiddlewareCoordinator {
    return this._middlewareCoordinator;
  }

  public use<TContext = unknown, TResult = unknown>(
    middleware: HttpMiddleware<TContext, TResult>,
    options?: HttpMiddlewareOptions,
  ): this {
    this._middlewareCoordinator.register(middleware, options);
    return this;
  }

  public get size(): number {
    return this._registry.size;
  }

  public get locked(): boolean {
    return this._registry.locked;
  }

  public lock(): void {
    this._registry.lock();
    this._middlewareCoordinator.registry.lock();
  }

  /**
   * Canonical route registration primitive.
   */
  public route(route: HttpRoute, options?: HttpRouteOptions): this {
    this._registry.register(route, options);
    return this;
  }

  public get(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `GET:${path}`,
        method: 'GET',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public post(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `POST:${path}`,
        method: 'POST',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public put(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `PUT:${path}`,
        method: 'PUT',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public patch(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `PATCH:${path}`,
        method: 'PATCH',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public delete(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `DELETE:${path}`,
        method: 'DELETE',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public head(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `HEAD:${path}`,
        method: 'HEAD',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public options(path: string, operation: string, options?: HttpRouteOptions): this {
    return this.route(
      {
        id: options?.metadata?.id ? String(options.metadata.id) : `OPTIONS:${path}`,
        method: 'OPTIONS',
        path,
        operation,
        priority: options?.priority,
        metadata: options?.metadata,
      },
      options,
    );
  }

  public resolve(method: HttpMethod, path: string): HttpRouteMatch | undefined {
    return this._resolver.resolve(method, path);
  }

  public match(request: HttpRequest): HttpRouteMatch | undefined {
    return this._resolver.match(request);
  }

  public findAllowedMethodsForPath(path: string): readonly HttpMethod[] {
    return this._resolver.findAllowedMethodsForPath(path);
  }
}
