import { HttpMethod, HttpRoute } from '@coreforge/contracts';

import { HttpRouteValidationError } from '../errors/HttpRoutingErrors';

const VALID_HTTP_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

export class HttpRouteValidator {
  public static validate(route: unknown): HttpRoute {
    if (!route || typeof route !== 'object' || Array.isArray(route)) {
      throw new HttpRouteValidationError('HttpRoute must be a non-null object');
    }

    const r = route as Record<string, unknown>;

    // 1. Validate ID
    if (typeof r.id !== 'string' || r.id.trim().length === 0) {
      throw new HttpRouteValidationError('HttpRoute.id must be a non-empty string');
    }

    // 2. Validate Method
    if (typeof r.method !== 'string' || !VALID_HTTP_METHODS.has(r.method.toUpperCase())) {
      throw new HttpRouteValidationError(
        `HttpRoute.method must be a valid HTTP method ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'), received '${String(r.method)}'`,
      );
    }

    // 3. Validate Path
    if (typeof r.path !== 'string' || r.path.trim().length === 0) {
      throw new HttpRouteValidationError('HttpRoute.path must be a non-empty string');
    }

    const trimmedPath = r.path.trim();
    if (!trimmedPath.startsWith('/')) {
      throw new HttpRouteValidationError(
        `HttpRoute.path must start with leading slash '/', received '${trimmedPath}'`,
      );
    }

    // 4. Validate Operation
    if (typeof r.operation !== 'string' || r.operation.trim().length === 0) {
      throw new HttpRouteValidationError('HttpRoute.operation must be a non-empty string');
    }

    // 5. Validate Priority
    if (r.priority !== undefined) {
      if (typeof r.priority !== 'number' || !Number.isFinite(r.priority) || r.priority < 0) {
        throw new HttpRouteValidationError(
          `HttpRoute.priority must be a finite non-negative number, received '${String(r.priority)}'`,
        );
      }
    }

    // 6. Validate Metadata
    if (r.metadata !== undefined) {
      if (typeof r.metadata !== 'object' || r.metadata === null || Array.isArray(r.metadata)) {
        throw new HttpRouteValidationError('HttpRoute.metadata must be an object if provided');
      }
    }

    return {
      id: r.id.trim(),
      method: r.method.toUpperCase() as HttpMethod,
      path: trimmedPath,
      operation: r.operation.trim(),
      priority: r.priority !== undefined ? (r.priority as number) : undefined,
      metadata: r.metadata !== undefined ? (r.metadata as Record<string, unknown>) : undefined,
    };
  }
}
