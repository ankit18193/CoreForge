import { RouteMethod } from '@coreforge/contracts';

import { Route } from './Route';

export function Delete(path = '/'): MethodDecorator {
  return Route(RouteMethod.DELETE, path);
}
