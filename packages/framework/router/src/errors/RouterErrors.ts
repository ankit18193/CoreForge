import { CoreForgeError } from '@coreforge/errors';

export class RouterStateError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-ROUTER_STATE_ERROR', cause);
  }
}

export class DuplicateRouteError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-DUPLICATE_ROUTE_ERROR', cause);
  }
}

export class RouteConflictError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-ROUTE_CONFLICT_ERROR', cause);
  }
}
