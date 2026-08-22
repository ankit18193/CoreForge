import { RouteMethod } from '@coreforge/contracts';

import { DecoratorValidator } from './DecoratorValidator';
import { DecoratorConflictError, DecoratorValidationError } from '../errors/DecoratorErrors';

export interface RouteValidationItem {
  readonly id: string;
  readonly method: string;
  readonly path: string;
  readonly controllerName?: string | undefined;
  readonly actionName?: string | undefined;
}

export class RouteDecoratorValidator {
  private static readonly VALID_METHODS = new Set<string>([
    RouteMethod.GET,
    RouteMethod.POST,
    RouteMethod.PUT,
    RouteMethod.PATCH,
    RouteMethod.DELETE,
    RouteMethod.OPTIONS,
    RouteMethod.HEAD,
    RouteMethod.ALL,
  ]);

  public static validatePathSyntax(path: unknown, decoratorName: string): void {
    if (path !== undefined && typeof path !== 'string') {
      throw new DecoratorValidationError(
        `@${decoratorName}: Route path must be a string if provided, received ${typeof path}.`,
      );
    }
  }

  public static validateMethod(method: unknown, decoratorName: string): void {
    if (typeof method !== 'string' || !this.VALID_METHODS.has(method.toUpperCase())) {
      throw new DecoratorValidationError(
        `@${decoratorName}: Invalid HTTP method "${String(method)}".`,
      );
    }
  }

  public static validateMethodDecorator(
    target: unknown,
    propertyKey: string | symbol | undefined,
    decoratorName: string,
  ): void {
    DecoratorValidator.validateMethodTarget(target, propertyKey, decoratorName);
  }

  public static validateNoCollisions(routes: readonly RouteValidationItem[]): void {
    const seen = new Map<string, RouteValidationItem>();

    for (const r of routes) {
      const key = `${r.method.toUpperCase()}:${r.path}`;
      const existing = seen.get(key);
      if (existing) {
        throw new DecoratorConflictError(
          `Conflicting route declaration: "${r.method.toUpperCase()} ${r.path}" is registered multiple times (actions: ${existing.actionName || existing.id} and ${r.actionName || r.id}).`,
        );
      }
      seen.set(key, r);
    }
  }
}
