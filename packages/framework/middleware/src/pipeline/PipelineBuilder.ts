import { Middleware } from '@coreforge/contracts';

import { MiddlewarePipeline } from './MiddlewarePipeline';
import { MiddlewarePriority } from './MiddlewarePriority';
import { MiddlewareState } from './MiddlewareState';
import { MiddlewareRegistrationError } from '../errors/MiddlewareErrors';
import { MiddlewareLifecycleManager } from '../lifecycle/MiddlewareLifecycleManager';
import { MiddlewareRegistry } from '../registry/MiddlewareRegistry';
import { MiddlewareScope } from '../registry/MiddlewareScope';

export class PipelineBuilder {
  private readonly _registry = new MiddlewareRegistry();
  private readonly _lifecycleManager = new MiddlewareLifecycleManager();

  private readonly _registeredIds = new Set<string>();
  private readonly _groupNames = new Set<string>();

  constructor() {
    this._lifecycleManager.transitionTo(MiddlewareState.BUILDING);
  }

  public useGlobal(middleware: Middleware, priority?: MiddlewarePriority): this {
    this.validateMiddleware(middleware);
    const options: { priority?: MiddlewarePriority } = {};
    if (priority !== undefined) {
      options.priority = priority;
    }
    const id = this._registry.register(middleware, MiddlewareScope.GLOBAL, options);
    this._registeredIds.add(id);
    return this;
  }

  public useGroup(name: string, middleware: Middleware, priority?: MiddlewarePriority): this {
    this.validateMiddleware(middleware);
    if (name === '') {
      throw new MiddlewareRegistrationError('Group name cannot be empty.');
    }
    const options: { priority?: MiddlewarePriority; groupName: string } = { groupName: name };
    if (priority !== undefined) {
      options.priority = priority;
    }
    const id = this._registry.register(middleware, MiddlewareScope.GROUP, options);
    this._registeredIds.add(id);
    this._groupNames.add(name);
    return this;
  }

  public useRoute(path: string, middleware: Middleware, priority?: MiddlewarePriority): this {
    this.validateMiddleware(middleware);
    if (!path.startsWith('/')) {
      throw new MiddlewareRegistrationError(
        `Invalid route binding path "${path}". Route path must start with "/".`,
      );
    }
    const options: { priority?: MiddlewarePriority; routePath: string } = { routePath: path };
    if (priority !== undefined) {
      options.priority = priority;
    }
    const id = this._registry.register(middleware, MiddlewareScope.ROUTE, options);
    this._registeredIds.add(id);
    return this;
  }

  public build(): MiddlewarePipeline {
    this._lifecycleManager.transitionTo(MiddlewareState.READY);
    return new MiddlewarePipeline(this._registry, this._lifecycleManager);
  }

  private validateMiddleware(middleware: Middleware): void {
    if (!middleware || typeof middleware.execute !== 'function') {
      throw new MiddlewareRegistrationError('Missing or invalid middleware implementation.');
    }
  }
}
