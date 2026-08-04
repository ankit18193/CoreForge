import { Logger as ILogger } from '@coreforge/contracts';

import { LogContext } from '../context/LogContext';
import { LogEntry } from '../entries/LogEntry';
import { FormatterError, WriterError } from '../errors/LoggingErrors';
import { Formatter } from '../formatters/Formatter';
import { LogLevel } from '../levels/LogLevel';
import { LoggerOptions } from '../types/loggingTypes';
import { Writer } from '../writers/Writer';

export class Logger implements ILogger {
  private readonly _formatter: Formatter;
  private readonly _writers: Writer[];
  private readonly _filters: LoggerOptions['filters'];
  private readonly _timestampProvider: LoggerOptions['timestampProvider'];
  private readonly _minLevel: LogLevel;
  private readonly _context: LogContext;

  constructor(options: LoggerOptions) {
    this._formatter = options.formatter;
    this._writers = options.writers;
    this._filters = options.filters;
    this._timestampProvider = options.timestampProvider;
    this._minLevel = options.minLevel;
    this._context = options.context;
  }

  public debug(message: string, context?: unknown): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: unknown): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: unknown): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, error?: Error, context?: unknown): void {
    this.logWithError(LogLevel.ERROR, message, error, context);
  }

  public fatal(message: string, error?: Error, context?: unknown): void {
    this.logWithError(LogLevel.FATAL, message, error, context);
  }

  public child(newContext: Partial<LogContext>): Logger {
    const mergedExtra = {
      ...(this._context.extra || {}),
      ...(newContext.extra || {}),
    };

    const mergedParams = {
      module: newContext.module !== undefined ? newContext.module : this._context.module,
      requestId:
        newContext.requestId !== undefined ? newContext.requestId : this._context.requestId,
      correlationId:
        newContext.correlationId !== undefined
          ? newContext.correlationId
          : this._context.correlationId,
      userId: newContext.userId !== undefined ? newContext.userId : this._context.userId,
      service: newContext.service !== undefined ? newContext.service : this._context.service,
      environment:
        newContext.environment !== undefined ? newContext.environment : this._context.environment,
      extra: Object.keys(mergedExtra).length > 0 ? mergedExtra : undefined,
    };

    return new Logger({
      formatter: this._formatter,
      writers: this._writers,
      filters: this._filters,
      timestampProvider: this._timestampProvider,
      minLevel: this._minLevel,
      context: new LogContext(mergedParams),
    });
  }

  private formatEntry(entry: LogEntry): string {
    try {
      return this._formatter.format(entry);
    } catch (err: unknown) {
      if (err instanceof FormatterError) {
        throw err;
      }
      const cause = err instanceof Error ? err : new Error(String(err));
      throw new FormatterError(`Formatter failed to format LogEntry: ${cause.message}`, {
        entry,
        error: cause.message,
      });
    }
  }

  private log(level: LogLevel, message: string, contextPayload?: unknown): void {
    if (level < this._minLevel) {
      return;
    }

    const entry = this.createEntry(level, message, undefined, contextPayload);
    if (!this.shouldLog(entry)) {
      return;
    }

    const formatted = this.formatEntry(entry);
    this.dispatchToWriters(formatted, entry);
  }

  private logWithError(
    level: LogLevel,
    message: string,
    error?: Error,
    contextPayload?: unknown,
  ): void {
    if (level < this._minLevel) {
      return;
    }

    const entry = this.createEntry(level, message, error, contextPayload);
    if (!this.shouldLog(entry)) {
      return;
    }

    const formatted = this.formatEntry(entry);
    this.dispatchToWriters(formatted, entry);
  }

  private shouldLog(entry: LogEntry): boolean {
    for (const filter of this._filters) {
      if (!filter.shouldLog(entry)) {
        return false;
      }
    }
    return true;
  }

  private dispatchToWriters(formatted: string, entry: LogEntry): void {
    for (const writer of this._writers) {
      try {
        const res = writer.write(formatted, entry);
        if (res instanceof Promise) {
          res.catch(() => {
            // Prevent exceptions in async writers from bringing down the process
          });
        }
      } catch (err: unknown) {
        if (err instanceof WriterError) {
          throw err;
        }
        const cause = err instanceof Error ? err : new Error(String(err));
        throw new WriterError(`Writer failed to write LogEntry: ${cause.message}`, {
          entry,
          error: cause.message,
        });
      }
    }
  }

  private createEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    contextPayload?: unknown,
  ): LogEntry {
    const id = Math.random().toString(36).substring(2, 15);
    const timestamp = this._timestampProvider.getTimestamp();
    const processId = typeof process !== 'undefined' ? process.pid : 0;

    const mergedParams = {
      module: this._context.module,
      requestId: this._context.requestId,
      correlationId: this._context.correlationId,
      userId: this._context.userId,
      service: this._context.service,
      environment: this._context.environment,
      extra: this._context.extra ? { ...this._context.extra } : {},
    };

    let metadata: Record<string, unknown> | undefined;

    if (error) {
      metadata = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    if (contextPayload && typeof contextPayload === 'object') {
      const payload = contextPayload as Record<string, unknown>;
      const standardKeys = [
        'module',
        'requestId',
        'correlationId',
        'userId',
        'service',
        'environment',
      ];

      for (const key of standardKeys) {
        if (key in payload) {
          (mergedParams as Record<string, unknown>)[key] = payload[key];
        }
      }

      const restKeys = Object.keys(payload).filter((k) => !standardKeys.includes(k));
      if (restKeys.length > 0) {
        const extraPayload: Record<string, unknown> = {};
        for (const k of restKeys) {
          extraPayload[k] = payload[k];
        }
        mergedParams.extra = {
          ...mergedParams.extra,
          ...extraPayload,
        };
      }
    }

    const finalContext = new LogContext({
      module: mergedParams.module,
      requestId: mergedParams.requestId,
      correlationId: mergedParams.correlationId,
      userId: mergedParams.userId,
      service: mergedParams.service,
      environment: mergedParams.environment,
      extra: Object.keys(mergedParams.extra).length > 0 ? mergedParams.extra : undefined,
    });

    return new LogEntry({
      id,
      timestamp,
      level,
      message,
      context: finalContext,
      metadata,
      processId,
    });
  }
}
