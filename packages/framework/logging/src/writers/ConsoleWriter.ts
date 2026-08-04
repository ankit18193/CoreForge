import { Writer } from './Writer';
import { LogEntry } from '../entries/LogEntry';
import { WriterError } from '../errors/LoggingErrors';
import { LogLevel } from '../levels/LogLevel';

export class ConsoleWriter implements Writer {
  public write(formattedEntry: string, entry: LogEntry): void {
    try {
      if (entry.level >= LogLevel.ERROR) {
        console.error(formattedEntry);
      } else if (entry.level === LogLevel.WARN) {
        console.warn(formattedEntry);
      } else {
        console.log(formattedEntry);
      }
    } catch (err: unknown) {
      const cause = err instanceof Error ? err : new Error(String(err));
      throw new WriterError(`ConsoleWriter failed to write LogEntry: ${cause.message}`, {
        entry,
        error: cause.message,
      });
    }
  }
}
