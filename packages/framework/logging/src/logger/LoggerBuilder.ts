import { Logger } from './Logger';
import { LogContext } from '../context/LogContext';
import { InvalidLogLevelError } from '../errors/LoggingErrors';
import { LogFilter } from '../filters/LogFilter';
import { Formatter } from '../formatters/Formatter';
import { DefaultTimestampProvider, TimestampProvider } from '../internal/TimestampProvider';
import { LogLevel } from '../levels/LogLevel';
import { Writer } from '../writers/Writer';

export class LoggerBuilder {
  private _formatter?: Formatter;
  private readonly _writers: Writer[] = [];
  private readonly _filters: LogFilter[] = [];
  private _timestampProvider?: TimestampProvider;
  private _minLevel: LogLevel = LogLevel.INFO;
  private _context?: LogContext;

  public setFormatter(formatter: Formatter): this {
    this._formatter = formatter;
    return this;
  }

  public addWriter(writer: Writer): this {
    this._writers.push(writer);
    return this;
  }

  public addFilter(filter: LogFilter): this {
    this._filters.push(filter);
    return this;
  }

  public setTimestampProvider(provider: TimestampProvider): this {
    this._timestampProvider = provider;
    return this;
  }

  public setMinLevel(level: LogLevel): this {
    if (level === undefined || level === null || LogLevel[level] === undefined) {
      throw new InvalidLogLevelError(`Invalid log level: ${level}`);
    }
    this._minLevel = level;
    return this;
  }

  public setContext(context: LogContext): this {
    this._context = context;
    return this;
  }

  public build(): Logger {
    if (!this._formatter) {
      throw new Error('LoggerBuilder: Formatter must be specified.');
    }
    if (this._writers.length === 0) {
      throw new Error('LoggerBuilder: At least one Writer must be added.');
    }

    return new Logger({
      formatter: this._formatter,
      writers: [...this._writers],
      filters: [...this._filters],
      timestampProvider: this._timestampProvider || new DefaultTimestampProvider(),
      minLevel: this._minLevel,
      context: this._context || new LogContext({}),
    });
  }
}
