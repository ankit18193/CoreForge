import { Router } from '@coreforge/contracts';
import { ControllerManager } from '@coreforge/controllers';
import { ExceptionMapper } from '@coreforge/exceptions';
import { MiddlewarePipeline } from '@coreforge/middleware';

import { RequestHandlerConfiguration, RouteMapping } from './RequestHandlerConfiguration';
import { RequestHandlerConfigurationError } from '../errors/RequestHandlerErrors';

export class RequestHandlerBuilder {
  private _router?: Router | undefined;
  private _middlewarePipeline?: MiddlewarePipeline | undefined;
  private _controllerManager?: ControllerManager | undefined;
  private _exceptionMapper?: ExceptionMapper | undefined;
  private readonly _routeMappings: RouteMapping[] = [];

  public setRouter(router: Router): this {
    this._router = router;
    return this;
  }

  public setMiddlewarePipeline(middlewarePipeline: MiddlewarePipeline): this {
    this._middlewarePipeline = middlewarePipeline;
    return this;
  }

  public setControllerManager(controllerManager: ControllerManager): this {
    this._controllerManager = controllerManager;
    return this;
  }

  public setExceptionMapper(exceptionMapper: ExceptionMapper): this {
    this._exceptionMapper = exceptionMapper;
    return this;
  }

  public addRouteMapping(mapping: RouteMapping): this {
    if (!mapping.path.startsWith('/')) {
      throw new RequestHandlerConfigurationError(
        `Invalid route mapping path "${mapping.path}". Must start with "/".`,
      );
    }

    const duplicate = this._routeMappings.some(
      (m) => m.method === mapping.method && m.path === mapping.path,
    );
    if (duplicate) {
      throw new RequestHandlerConfigurationError(
        `Duplicate route mapping registered for ${mapping.method} ${mapping.path}.`,
      );
    }

    this._routeMappings.push(mapping);
    return this;
  }

  public build(): RequestHandlerConfiguration {
    if (!this._router) {
      throw new RequestHandlerConfigurationError('Router is required for RequestHandler.');
    }
    if (!this._middlewarePipeline) {
      throw new RequestHandlerConfigurationError('MiddlewarePipeline is required.');
    }
    if (!this._controllerManager) {
      throw new RequestHandlerConfigurationError('ControllerManager is required.');
    }

    return new RequestHandlerConfiguration({
      router: this._router,
      middlewarePipeline: this._middlewarePipeline,
      controllerManager: this._controllerManager,
      exceptionMapper: this._exceptionMapper,
      routeMappings: this._routeMappings,
    });
  }
}
