import { RouteMethod } from '@coreforge/contracts';

import { Route } from './Route';

export function Post(path = '/'): MethodDecorator {
  return Route(RouteMethod.POST, path);
}
