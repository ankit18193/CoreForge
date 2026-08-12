import { RouteMethod } from '@coreforge/contracts';

import { RoutePattern } from '../matcher/RoutePattern';

export interface RouteDescriptor {
  readonly id: string;
  readonly method: RouteMethod;
  readonly originalPath: string;
  readonly normalizedPath: string;
  readonly pattern: RoutePattern;
  readonly parameterNames: readonly string[];
  readonly createdAt: number;
}
