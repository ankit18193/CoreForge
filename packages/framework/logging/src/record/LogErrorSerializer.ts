import { LogErrorDescriptor } from '../types/loggingTypes';

export interface LogErrorSerializerOptions {
  readonly exposeStack?: boolean | undefined;
  readonly maxCauseDepth?: number | undefined;
}

export class LogErrorSerializer {
  private readonly _exposeStack: boolean;
  private readonly _maxCauseDepth: number;

  constructor(options: LogErrorSerializerOptions = {}) {
    this._exposeStack = options.exposeStack ?? true;
    this._maxCauseDepth = options.maxCauseDepth ?? 5;
  }

  public serialize(
    error: unknown,
    seen = new WeakSet<object>(),
    depth = 0,
  ): LogErrorDescriptor | undefined {
    if (error === null || error === undefined) {
      return undefined;
    }

    if (depth > this._maxCauseDepth) {
      return {
        name: 'Error',
        message: '[MAX_CAUSE_DEPTH_EXCEEDED]',
      };
    }

    if (typeof error === 'object' && error !== null) {
      if (seen.has(error)) {
        return {
          name: 'Error',
          message: '[Circular]',
        };
      }
      seen.add(error);
    }

    try {
      if (error instanceof Error) {
        const errorObj = error as Error & { code?: string; cause?: unknown };
        let causeDesc: LogErrorDescriptor | undefined;

        if (errorObj.cause !== undefined && errorObj.cause !== null) {
          causeDesc = this.serialize(errorObj.cause, seen, depth + 1);
        }

        return Object.freeze({
          name: error.name || 'Error',
          message: error.message || String(error),
          code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
          stack: this._exposeStack ? error.stack : undefined,
          cause: causeDesc,
        });
      }

      if (typeof error === 'object' && error !== null) {
        const record = error as Record<string, unknown>;
        return Object.freeze({
          name: typeof record.name === 'string' ? record.name : 'Error',
          message: typeof record.message === 'string' ? record.message : JSON.stringify(error),
          code: typeof record.code === 'string' ? record.code : undefined,
          stack: this._exposeStack && typeof record.stack === 'string' ? record.stack : undefined,
          cause:
            record.cause !== undefined ? this.serialize(record.cause, seen, depth + 1) : undefined,
        });
      }

      return Object.freeze({
        name: 'Error',
        message: String(error),
      });
    } catch {
      return Object.freeze({
        name: 'Error',
        message: 'Failed to serialize error',
      });
    }
  }
}
