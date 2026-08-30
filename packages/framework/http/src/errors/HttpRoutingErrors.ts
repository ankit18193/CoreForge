import { HttpError } from './HttpErrors';

export class HttpRoutingError extends HttpError {
  constructor(message: string, code = 'CF-HTTP-ROUTING', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpRoutingError';
  }
}

export class HttpRouteRegistrationError extends HttpRoutingError {
  constructor(message: string, code = 'CF-HTTP-ROUTE-REGISTRATION', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpRouteRegistrationError';
  }
}

export class HttpRouteDuplicateError extends HttpRoutingError {
  public readonly routeId: string;

  constructor(routeId: string, message?: string, cause?: Error) {
    super(
      message ?? `HTTP route with ID '${routeId}' is already registered`,
      'CF-HTTP-ROUTE-DUPLICATE',
      cause,
    );
    this.name = 'HttpRouteDuplicateError';
    this.routeId = routeId;
  }
}

export class HttpRouteValidationError extends HttpRoutingError {
  constructor(message: string, code = 'CF-HTTP-ROUTE-VALIDATION', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpRouteValidationError';
  }
}

export class HttpRouteNotFoundError extends HttpRoutingError {
  public readonly method: string;
  public readonly path: string;

  constructor(method: string, path: string, message?: string, cause?: Error) {
    super(
      message ?? `No HTTP route found matching ${method} ${path}`,
      'CF-HTTP-ROUTE-NOT-FOUND',
      cause,
    );
    this.name = 'HttpRouteNotFoundError';
    this.method = method;
    this.path = path;
  }
}

export class HttpMethodNotAllowedError extends HttpRoutingError {
  public readonly method: string;
  public readonly path: string;
  public readonly allowedMethods: readonly string[];

  constructor(
    method: string,
    path: string,
    allowedMethods: readonly string[] = [],
    message?: string,
    cause?: Error,
  ) {
    super(
      message ??
        `HTTP method '${method}' is not allowed for path '${path}'. Allowed methods: [${allowedMethods.join(', ')}]`,
      'CF-HTTP-METHOD-NOT-ALLOWED',
      cause,
    );
    this.name = 'HttpMethodNotAllowedError';
    this.method = method;
    this.path = path;
    this.allowedMethods = Object.freeze([...allowedMethods]);
  }
}

export class HttpRouteConflictError extends HttpRoutingError {
  constructor(message: string, code = 'CF-HTTP-ROUTE-CONFLICT', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpRouteConflictError';
  }
}

export class HttpParameterError extends HttpRoutingError {
  public readonly parameterName?: string | undefined;

  constructor(message: string, parameterName?: string, cause?: Error) {
    super(message, 'CF-HTTP-PARAMETER', cause);
    this.name = 'HttpParameterError';
    this.parameterName = parameterName;
  }
}
