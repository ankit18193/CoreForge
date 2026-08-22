import { RouteMethod } from '@coreforge/contracts';

import { Route } from './Route';

export function Patch(path = '/'): MethodDecorator {
  return Route(RouteMethod.PATCH, path);
}
