import { RoutingConfigurationError } from '../errors/RoutingErrors';
import { HttpMethod } from '../types/routingTypes';

const VALID_METHODS = new Set<string>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export class HttpMethodUtil {
  public static isValid(method: unknown): method is HttpMethod {
    return typeof method === 'string' && VALID_METHODS.has(method.toUpperCase());
  }

  public static normalize(method: unknown): HttpMethod {
    if (typeof method !== 'string' || !method.trim()) {
      return 'GET';
    }

    const upper = method.trim().toUpperCase();
    if (!VALID_METHODS.has(upper)) {
      throw new RoutingConfigurationError(
        `Unsupported HTTP method '${method}'. Supported methods: ${Array.from(VALID_METHODS).join(', ')}`,
      );
    }

    return upper as HttpMethod;
  }
}
