import { RouteMethod } from '@coreforge/contracts';

import { Route } from './Route';

export function Put(path = '/'): MethodDecorator {
  return Route(RouteMethod.PUT, path);
}
