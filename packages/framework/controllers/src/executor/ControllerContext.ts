import { ActionContext, Container, EventBus, Logger } from '@coreforge/contracts';

export class ControllerContext implements ActionContext {
  public readonly request: Readonly<Record<string, unknown>>;
  public response: Record<string, unknown>;
  public readonly route: Readonly<Record<string, unknown>>;
  public readonly logger: Logger;
  public readonly eventBus: EventBus;
  public readonly container: Container;
  public readonly parameters: Readonly<Record<string, string>>;
  public readonly requestId: string;

  constructor(params: {
    request: Record<string, unknown>;
    response: Record<string, unknown>;
    route: Record<string, unknown>;
    logger: Logger;
    eventBus: EventBus;
    container: Container;
    parameters: Record<string, string>;
    requestId: string;
  }) {
    this.request = this.deepFreeze({ ...params.request });
    this.response = params.response;
    this.route = this.deepFreeze({ ...params.route });
    this.logger = params.logger;
    this.eventBus = params.eventBus;
    this.container = params.container;
    this.parameters = this.deepFreeze({ ...params.parameters });
    this.requestId = params.requestId;
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
