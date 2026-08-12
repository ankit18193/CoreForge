import { RouteMethod, Router } from '@coreforge/contracts';
import { ControllerManager } from '@coreforge/controllers';
import { ExceptionMapper } from '@coreforge/exceptions';
import { MiddlewarePipeline } from '@coreforge/middleware';

import { RequestHandlerOptions } from './RequestHandlerOptions';

export interface RouteMapping {
  readonly method: RouteMethod;
  readonly path: string;
  readonly controllerId: string;
  readonly actionName: string;
}

export class RequestHandlerConfiguration {
  public readonly router: Router;
  public readonly middlewarePipeline: MiddlewarePipeline;
  public readonly controllerManager: ControllerManager;
  public readonly exceptionMapper?: ExceptionMapper | undefined;
  public readonly routeMappings: readonly RouteMapping[];

  constructor(options: RequestHandlerOptions) {
    this.router = options.router;
    this.middlewarePipeline = options.middlewarePipeline;
    this.controllerManager = options.controllerManager;
    this.exceptionMapper = options.exceptionMapper;
    this.routeMappings = Object.freeze([...options.routeMappings]);
    Object.freeze(this);
  }
}
