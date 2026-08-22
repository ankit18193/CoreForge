import { RouteMethod } from '@coreforge/contracts';

import { Route } from './Route';

export function Get(path = '/'): MethodDecorator {
  return Route(RouteMethod.GET, path);
}
