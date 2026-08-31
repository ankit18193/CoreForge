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

        // If field is specified and body is an object, extract the field from body
        if (field) {
          if (typeof request.body === 'object' && !Array.isArray(request.body)) {
            const bodyObj = request.body as Record<string, unknown>;
            return Object.prototype.hasOwnProperty.call(bodyObj, field)
              ? bodyObj[field]
              : undefined;
          }
          return undefined;
        }

        // Entire body requested
        return request.body;
      }

      default:
        return undefined;
    }
  }
}
