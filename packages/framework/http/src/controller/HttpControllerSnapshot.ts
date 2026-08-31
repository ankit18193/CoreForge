import type {
  HttpController,
  HttpControllerContext,
  HttpControllerResult,
  HttpControllerResultState,
  HttpEndpoint,
} from '@coreforge/contracts';

export class HttpControllerSnapshot {
  /**
   * Create a deep-frozen immutable snapshot of a controller context.
   */
  public static createContext<TReq = unknown>(
    ctx: HttpControllerContext<TReq>,
  ): HttpControllerContext<TReq> {
    const frozen: HttpControllerContext<TReq> = {
      request: Object.freeze({ ...ctx.request }),
      route: Object.freeze({ ...ctx.route }),
      parameters: Object.freeze({ ...ctx.parameters }),
      metadata: Object.freeze({ ...ctx.metadata }),
      transportContext: ctx.transportContext
        ? Object.freeze({ ...ctx.transportContext })
        : undefined,
      executionContext: ctx.executionContext,
    };
    return Object.freeze(frozen);
  }

  /**
   * Create an immutable result snapshot.
   */
  public static createResult<TValue = unknown>(
    success: boolean,
    state: HttpControllerResultState,
    durationMs: number,
    value?: TValue,
    metadata?: Record<string, unknown>,
  ): HttpControllerResult<TValue> {
    return Object.freeze({
      success,
      state,
      durationMs,
      value,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    }) as HttpControllerResult<TValue>;
  }

  /**
   * Create an immutable deep-frozen endpoint snapshot.
   */
  public static createEndpoint(endpoint: HttpEndpoint): HttpEndpoint {
    return Object.freeze({
      id: endpoint.id,
      name: endpoint.name,
      routeId: endpoint.routeId,
      operation: endpoint.operation,
      controllerId: endpoint.controllerId,
      metadata: Object.freeze({ ...endpoint.metadata }),
      enabled: endpoint.enabled,
      priority: endpoint.priority,
    });
  }

  /**
   * Create an immutable deep-frozen controller snapshot.
   */
  public static createController(controller: HttpController): HttpController {
    return Object.freeze({
      id: controller.id,
      name: controller.name,
      priority: controller.priority,
      execute: controller.execute.bind(controller),
    });
  }
}
