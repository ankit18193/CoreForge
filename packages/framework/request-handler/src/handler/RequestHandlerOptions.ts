import { Router } from '@coreforge/contracts';
import { ControllerManager } from '@coreforge/controllers';
import { ExceptionMapper } from '@coreforge/exceptions';
import { MiddlewarePipeline } from '@coreforge/middleware';

import { RouteMapping } from './RequestHandlerConfiguration';

export interface RequestHandlerOptions {
  readonly router: Router;
  readonly middlewarePipeline: MiddlewarePipeline;
  readonly controllerManager: ControllerManager;
  readonly exceptionMapper?: ExceptionMapper | undefined;
  readonly routeMappings: readonly RouteMapping[];
}
