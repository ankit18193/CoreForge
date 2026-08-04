import { LogContext } from '../context/LogContext';
import { LogLevel } from '../levels/LogLevel';

export class LogEntry {
  public readonly id: string;
  public readonly timestamp: number;
  public readonly level: LogLevel;
  public readonly message: string;
  public readonly context?: LogContext | undefined;
  public readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  public readonly processId: number;
  public readonly threadId?: string | number | undefined;
  public readonly traceId?: string | undefined;
  public readonly spanId?: string | undefined;

  constructor(params: {
    id: string;
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: LogContext | undefined;
    metadata?: Record<string, unknown> | undefined;
    processId: number;
    threadId?: string | number | undefined;
    traceId?: string | undefined;
    spanId?: string | undefined;
  }) {
    this.id = params.id;
    this.timestamp = params.timestamp;
    this.level = params.level;
    this.message = params.message;
    this.context = params.context;
    this.processId = params.processId;
    this.threadId = params.threadId;
    this.traceId = params.traceId;
    this.spanId = params.spanId;

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
