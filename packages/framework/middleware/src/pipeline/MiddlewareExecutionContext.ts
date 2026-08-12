import {
  Container,
  EventBus,
  Logger,
  MiddlewareContext as IMiddlewareContext,
} from '@coreforge/contracts';

export class MiddlewareExecutionContext implements IMiddlewareContext {
  public readonly request: Readonly<Record<string, unknown>>;
  public response: Record<string, unknown>;
  public readonly route: Readonly<Record<string, unknown>>;
  public readonly parameters: Readonly<Record<string, string>>;
  public readonly container: Container;
  public readonly logger: Logger;
  public readonly eventBus: EventBus;
  public readonly requestId: string;
  public readonly executionStart: number;
  public readonly diagnostics: Record<string, unknown> = {};

  constructor(params: {
    request: Record<string, unknown>;
    response: Record<string, unknown>;
    route?: Record<string, unknown> | undefined;
    parameters?: Record<string, string> | undefined;
    container: Container;
    logger: Logger;
    eventBus: EventBus;
    requestId: string;
  }) {
    this.request = this.deepFreeze({ ...params.request });
    this.response = params.response;
    this.route = this.deepFreeze({ ...(params.route || {}) });
    this.parameters = this.deepFreeze({ ...(params.parameters || {}) });
    this.container = params.container;
    this.logger = params.logger;
    this.eventBus = params.eventBus;
    this.requestId = params.requestId;
    this.executionStart = Date.now();
  }

  private deepFreeze<T>(obj: T): T {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const propVal = (obj as Record<string, unknown>)[prop];
        if (
          propVal !== null &&
          (typeof propVal === 'object' || typeof propVal === 'function') &&
          !Object.isFrozen(propVal)
        ) {
          this.deepFreeze(propVal);
        }
      });
    }
    return obj;
  }
}
