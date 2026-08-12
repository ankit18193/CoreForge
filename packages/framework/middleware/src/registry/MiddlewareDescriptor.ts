import { Middleware } from '@coreforge/contracts';

import { MiddlewareScope } from './MiddlewareScope';
import { MiddlewarePriority } from '../pipeline/MiddlewarePriority';

export interface MiddlewareDescriptor {
  readonly id: string;
  readonly name: string;
  readonly scope: MiddlewareScope;
  readonly priority: MiddlewarePriority;
  readonly registrationOrder: number;
  readonly middleware: Middleware;
  readonly enabled: boolean;
  readonly createdAt: number;
}
