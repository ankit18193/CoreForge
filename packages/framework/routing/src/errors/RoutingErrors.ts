import { CoreForgeError } from '@coreforge/errors';

import { HttpMethod } from '../types/routingTypes';

export class RoutingError extends CoreForgeError {
  constructor(message: string, code = 'CF-ROUTING-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class RoutingConfigurationError extends RoutingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ROUTING-CONFIGURATION', details);
  }
}

export class RouteCompilationError extends RoutingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ROUTING-COMPILATION', details);
  }
}

export class RouteConflictError extends RoutingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ROUTING-CONFLICT', details);
  }
}

export class RouteNotFoundError extends RoutingError {
  constructor(path: string, method: string) {
    super(`No route found matching [${method}] '${path}'.`, 'CF-ROUTING-NOT-FOUND', {
      path,
      method,
    });
  }
}

export class MethodNotAllowedError extends RoutingError {
  public readonly allowedMethods: readonly HttpMethod[];

  constructor(path: string, method: string, allowedMethods: readonly HttpMethod[]) {
    super(
      `Method [${method}] not allowed for path '${path}'. Allowed methods: ${allowedMethods.join(', ')}`,
      'CF-ROUTING-METHOD-NOT-ALLOWED',
      { path, method, allowedMethods },
    );
    this.allowedMethods = Object.freeze([...allowedMethods]);
  }
}

export class InvalidRoutePatternError extends RoutingError {
  constructor(pattern: string, reason: string) {
    super(`Invalid route pattern '${pattern}': ${reason}`, 'CF-ROUTING-INVALID-PATTERN', {
      pattern,
      reason,
    });
  }
}

export class InvalidRouteParameterError extends RoutingError {
  constructor(paramName: string, reason: string) {
    super(`Invalid route parameter '${paramName}': ${reason}`, 'CF-ROUTING-INVALID-PARAMETER', {
      paramName,
      reason,
    });
  }
}

export class DuplicateRouteParameterError extends RoutingError {
  constructor(paramName: string, pattern: string) {
    super(
      `Duplicate route parameter '${paramName}' found in pattern '${pattern}'. Parameter names must be unique within a route.`,
      'CF-ROUTING-DUPLICATE-PARAMETER',
      { paramName, pattern },
    );
  }
}

export class MalformedPathError extends RoutingError {
  constructor(path: string, reason: string) {
    super(`Malformed URI path '${path}': ${reason}`, 'CF-ROUTING-MALFORMED-PATH', { path, reason });
  }
}

export class RoutingStateError extends RoutingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ROUTING-STATE', details);
  }
}
