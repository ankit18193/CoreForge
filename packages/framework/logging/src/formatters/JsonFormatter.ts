import { Formatter } from './Formatter';
import { LogEntry } from '../entries/LogEntry';
import { FormatterError } from '../errors/LoggingErrors';
import { LogLevel } from '../levels/LogLevel';

export class JsonFormatter implements Formatter {
  public format(entry: LogEntry): string {
    try {
      return JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        level: LogLevel[entry.level] || entry.level,
        message: entry.message,
        context: entry.context,
        metadata: entry.metadata,
        processId: entry.processId,
        threadId: entry.threadId,
        traceId: entry.traceId,
        spanId: entry.spanId,
      });
    } catch (err: unknown) {
      const cause = err instanceof Error ? err : new Error(String(err));
      throw new FormatterError(`JsonFormatter failed to format LogEntry: ${cause.message}`, {
        entry,
        error: cause.message,
      });
    }
  }
}
