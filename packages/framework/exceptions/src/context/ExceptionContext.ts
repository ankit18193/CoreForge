import { ExceptionContext as IExceptionContext } from '@coreforge/contracts';

export class ExceptionContext implements IExceptionContext {
  public readonly requestId?: string | undefined;
  public readonly traceId?: string | undefined;
  public readonly spanId?: string | undefined;
  public readonly module?: string | undefined;
  public readonly service?: string | undefined;
  public readonly operation?: string | undefined;
  public readonly environment?: string | undefined;
  public readonly runtimeState?: string | undefined;
  public readonly moduleState?: string | undefined;
  public readonly timestamp: number;
  public readonly metadata?: Readonly<Record<string, unknown>> | undefined;

  constructor(params: {
    requestId?: string | undefined;
    traceId?: string | undefined;
    spanId?: string | undefined;
    module?: string | undefined;
    service?: string | undefined;
    operation?: string | undefined;
    environment?: string | undefined;
    runtimeState?: string | undefined;
    moduleState?: string | undefined;
    timestamp?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
  }) {
    this.requestId = params.requestId;
    this.traceId = params.traceId;
    this.spanId = params.spanId;
    this.module = params.module;
    this.service = params.service;
    this.operation = params.operation;
    this.environment = params.environment;
    this.runtimeState = params.runtimeState;
    this.moduleState = params.moduleState;
    this.timestamp = params.timestamp !== undefined ? params.timestamp : Date.now();

    if (params.metadata) {
      this.metadata = this.deepFreeze({ ...params.metadata });
    }

    Object.freeze(this);
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
