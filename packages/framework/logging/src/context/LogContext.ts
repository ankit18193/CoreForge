export class LogContext {
  public readonly module?: string | undefined;
  public readonly requestId?: string | undefined;
  public readonly correlationId?: string | undefined;
  public readonly userId?: string | undefined;
  public readonly service?: string | undefined;
  public readonly environment?: string | undefined;
  public readonly extra?: Readonly<Record<string, unknown>> | undefined;

  constructor(params: {
    module?: string | undefined;
    requestId?: string | undefined;
    correlationId?: string | undefined;
    userId?: string | undefined;
    service?: string | undefined;
    environment?: string | undefined;
    extra?: Record<string, unknown> | undefined;
  }) {
    this.module = params.module;
    this.requestId = params.requestId;
    this.correlationId = params.correlationId;
    this.userId = params.userId;
    this.service = params.service;
    this.environment = params.environment;

    if (params.extra) {
      this.extra = this.deepFreeze({ ...params.extra });
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
