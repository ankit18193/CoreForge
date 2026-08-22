import { Middleware } from '@coreforge/contracts';

import { MiddlewareDescriptor } from './MiddlewareDescriptor';
import { MiddlewareScope } from './MiddlewareScope';
import { MiddlewareRegistrationError } from '../errors/MiddlewareErrors';
import { MiddlewarePriority } from '../pipeline/MiddlewarePriority';

export class MiddlewareRegistry {
  private readonly _descriptors = new Map<string, MiddlewareDescriptor>();
  private readonly _globalOrder: string[] = [];
  private readonly _groupMappings = new Map<string, string[]>();
  private readonly _routeMappings = new Map<string, string[]>();
  private _counter = 0;

  public register(
    middleware: Middleware,
    scope: MiddlewareScope,
    options?: {
      priority?: MiddlewarePriority;
      id?: string;
      groupName?: string;
      routePath?: string;
    },
  ): string {
    const id = options?.id || `mw-${scope}-${++this._counter}`;

    if (this._descriptors.has(id)) {
      throw new MiddlewareRegistrationError(`Middleware with id ${id} is already registered.`);
    }

    const priority = options?.priority !== undefined ? options.priority : MiddlewarePriority.NORMAL;

    const descriptor: MiddlewareDescriptor = {
      id,
      name: middleware.constructor.name,
      scope,
      priority,
      registrationOrder: ++this._counter,
      middleware,
      enabled: true,
      createdAt: Date.now(),
    };

    this._descriptors.set(id, Object.freeze(descriptor));

    if (scope === MiddlewareScope.GLOBAL) {
      this._globalOrder.push(id);
      this.sortGlobal();
    } else if (scope === MiddlewareScope.GROUP && options?.groupName) {
      const list = this._groupMappings.get(options.groupName) || [];
      list.push(id);
      this._groupMappings.set(options.groupName, list);
    } else if (scope === MiddlewareScope.ROUTE && options?.routePath) {
      const list = this._routeMappings.get(options.routePath) || [];
      list.push(id);
      this._routeMappings.set(options.routePath, list);
    }

    return id;
  }

  public getGlobal(): readonly MiddlewareDescriptor[] {
    return Object.freeze(
      this._globalOrder.map((id) => this._descriptors.get(id)!).filter((d) => d && d.enabled),
    );
  }

  public getGroup(groupName: string): readonly MiddlewareDescriptor[] {
    const ids = this._groupMappings.get(groupName) || [];
    const list = ids.map((id) => this._descriptors.get(id)!).filter((d) => d && d.enabled);
    list.sort(this.compareDescriptors);
    return Object.freeze(list);
  }

  public getRoute(routePath: string): readonly MiddlewareDescriptor[] {
    const ids = this._routeMappings.get(routePath) || [];
    const list = ids.map((id) => this._descriptors.get(id)!).filter((d) => d && d.enabled);
    list.sort(this.compareDescriptors);
    return Object.freeze(list);
  }

  public getAll(): readonly MiddlewareDescriptor[] {
    return Object.freeze(Array.from(this._descriptors.values()));
  }

  private sortGlobal(): void {
    this._globalOrder.sort((a, b) => {
      const dA = this._descriptors.get(a)!;
      const dB = this._descriptors.get(b)!;
      return this.compareDescriptors(dA, dB);
    });
  }

  private compareDescriptors(dA: MiddlewareDescriptor, dB: MiddlewareDescriptor): number {
    if (dA.priority !== dB.priority) {
      return dA.priority - dB.priority;
    }
    return dA.registrationOrder - dB.registrationOrder;
  }
}
