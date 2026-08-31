import type { HttpController, HttpEndpoint } from '@coreforge/contracts';

import {
  HttpControllerValidationError,
  HttpEndpointValidationError,
} from '../errors/HttpControllerErrors';

export class HttpControllerValidator {
  public static validate(controller: unknown): HttpController {
    if (!controller || typeof controller !== 'object') {
      throw new HttpControllerValidationError('Controller must be a non-null object');
    }

    const c = controller as Record<string, unknown>;

    if (typeof c['id'] !== 'string' || c['id'].trim() === '') {
      throw new HttpControllerValidationError('Controller id must be a non-empty string');
    }

    if (typeof c['name'] !== 'string' || c['name'].trim() === '') {
      throw new HttpControllerValidationError('Controller name must be a non-empty string');
    }

    if (typeof c['execute'] !== 'function') {
      throw new HttpControllerValidationError(
        `Controller '${c['id']}' must implement an execute() method`,
      );
    }

    if (c['priority'] !== undefined && typeof c['priority'] !== 'number') {
      throw new HttpControllerValidationError(
        `Controller '${c['id']}' priority must be a number when provided`,
      );
    }

    return controller as HttpController;
  }

  public static validateEndpoint(endpoint: unknown): HttpEndpoint {
    if (!endpoint || typeof endpoint !== 'object') {
      throw new HttpEndpointValidationError('Endpoint must be a non-null object');
    }

    const e = endpoint as Record<string, unknown>;

    if (typeof e['id'] !== 'string' || e['id'].trim() === '') {
      throw new HttpEndpointValidationError('Endpoint id must be a non-empty string');
    }

    if (typeof e['name'] !== 'string' || e['name'].trim() === '') {
      throw new HttpEndpointValidationError(
        'Endpoint name must be a non-empty string',
        e['id'] as string,
      );
    }

    if (typeof e['routeId'] !== 'string' || e['routeId'].trim() === '') {
      throw new HttpEndpointValidationError(
        'Endpoint routeId must be a non-empty string',
        e['id'] as string,
      );
    }

    if (typeof e['operation'] !== 'string' || e['operation'].trim() === '') {
      throw new HttpEndpointValidationError(
        'Endpoint operation must be a non-empty string',
        e['id'] as string,
      );
    }

    if (typeof e['controllerId'] !== 'string' || e['controllerId'].trim() === '') {
      throw new HttpEndpointValidationError(
        'Endpoint controllerId must be a non-empty string',
        e['id'] as string,
      );
    }

    return endpoint as HttpEndpoint;
  }
}
