import { LogErrorSerializer } from './LogErrorSerializer';
import { LoggingSerializationError } from '../errors/LoggingErrors';
import { LogRecord, LogRecordOptions } from '../types/loggingTypes';

export class LogRecordFactory {
  private readonly _errorSerializer: LogErrorSerializer;
  private readonly _maxMessageLength?: number | undefined;

  constructor(
    options: {
      exposeStack?: boolean | undefined;
      maxCauseDepth?: number | undefined;
      maxMessageLength?: number | undefined;
    } = {},
  ) {
    this._errorSerializer = new LogErrorSerializer({
      exposeStack: options.exposeStack,
      maxCauseDepth: options.maxCauseDepth,
    });
    this._maxMessageLength = options.maxMessageLength;
  }

  public create(options: LogRecordOptions): LogRecord {
    if (typeof options.message !== 'string') {
      throw new LoggingSerializationError(
        `Log message must be a string. Received type '${typeof options.message}'.`,
      );
    }

    let message = options.message;
    if (this._maxMessageLength !== undefined && message.length > this._maxMessageLength) {
      message = message.substring(0, this._maxMessageLength) + '... [TRUNCATED]';
    }

    const timestamp = options.timestamp ?? Date.now();
    const context = options.context
      ? (this._safeClone(options.context) as Readonly<Record<string, unknown>>)
      : Object.freeze({});
    const metadata = options.metadata
      ? (this._safeClone(options.metadata) as Readonly<Record<string, unknown>>)
      : undefined;
    const errorDescriptor =
      options.error !== undefined ? this._errorSerializer.serialize(options.error) : undefined;

    return Object.freeze({
      timestamp,
      level: options.level,
      message,
      context,
      metadata,
      error: errorDescriptor,
    });
  }

  private _safeClone(obj: unknown, seen = new WeakSet<object>()): unknown {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    if (seen.has(obj as object)) {
      return '[Circular]';
    }

    seen.add(obj as object);

    if (Array.isArray(obj)) {
      return Object.freeze(obj.map((item) => this._safeClone(item, seen)));
    }

    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      copy[key] = this._safeClone(value, seen);
    }

    return Object.freeze(copy);
  }
}
