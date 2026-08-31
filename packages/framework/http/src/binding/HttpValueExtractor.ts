import type { HttpBindingDefinition, HttpBindingSource, HttpRequest } from '@coreforge/contracts';

export class HttpValueExtractor {
  /**
   * Extract a raw value from an HTTP request according to the binding definition.
   */
  public static extract(
    request: HttpRequest,
    definition: HttpBindingDefinition,
    pathParameters?: Readonly<Record<string, string>>,
  ): unknown {
    return HttpValueExtractor.extractFromSource(
      request,
      definition.source,
      definition.field,
      pathParameters,
    );
  }

  /**
   * Extract a raw value from a specific HTTP binding source.
   */
  public static extractFromSource(
    request: HttpRequest,
    source: HttpBindingSource,
    field?: string,
    pathParameters?: Readonly<Record<string, string>>,
  ): unknown {
    switch (source) {
      case 'PATH': {
        if (!field) {
          return undefined;
        }
        // First check explicitly provided path parameters, then fallback to request.pathParameters
        if (pathParameters && Object.prototype.hasOwnProperty.call(pathParameters, field)) {
          return pathParameters[field];
        }
        if (
          request.pathParameters &&
          Object.prototype.hasOwnProperty.call(request.pathParameters, field)
        ) {
          return request.pathParameters[field];
        }
        return undefined;
      }

      case 'QUERY': {
        if (!field || !request.query) {
          return undefined;
        }
        return Object.prototype.hasOwnProperty.call(request.query, field)
          ? request.query[field]
          : undefined;
      }

      case 'HEADER': {
        if (!field || !request.headers) {
          return undefined;
        }
        const normalizedTarget = field.toLowerCase();
        for (const [key, value] of Object.entries(request.headers)) {
          if (key.toLowerCase() === normalizedTarget) {
            return value;
          }
        }
        return undefined;
      }

      case 'COOKIE': {
        if (!field || !request.cookies) {
          return undefined;
        }
        return Object.prototype.hasOwnProperty.call(request.cookies, field)
          ? request.cookies[field]
          : undefined;
      }

      case 'BODY': {
        if (request.body === undefined || request.body === null) {
          return undefined;
        }

        // Unwrap if body is a routed request payload from middleware pipeline
        let actualBody: unknown = request.body;
        if (
          typeof actualBody === 'object' &&
          actualBody !== null &&
          'serviceName' in actualBody &&
          'input' in actualBody
        ) {
          const inputObj = (actualBody as { input?: { body?: unknown } }).input;
          actualBody =
            inputObj && typeof inputObj === 'object' && 'body' in inputObj
              ? inputObj.body
              : actualBody;
        }

        if (actualBody === undefined || actualBody === null) {
          return undefined;
        }

        // If field is specified and body is an object, extract the field from body
        if (field) {
          if (typeof actualBody === 'object' && !Array.isArray(actualBody)) {
            const bodyObj = actualBody as Record<string, unknown>;
            return Object.prototype.hasOwnProperty.call(bodyObj, field)
              ? bodyObj[field]
              : undefined;
          }
          return undefined;
        }

        // Entire body requested
        return actualBody;
      }

      default:
        return undefined;
    }
  }
}
