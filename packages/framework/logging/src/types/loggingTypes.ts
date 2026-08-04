import { LogContext } from '../context/LogContext';
import { LogFilter } from '../filters/LogFilter';
import { Formatter } from '../formatters/Formatter';
import { TimestampProvider } from '../internal/TimestampProvider';
import { LogLevel } from '../levels/LogLevel';
import { Writer } from '../writers/Writer';

export interface LoggerOptions {
  formatter: Formatter;
  writers: Writer[];
  filters: LogFilter[];
  timestampProvider: TimestampProvider;
  minLevel: LogLevel;
  context: LogContext;
}
