import { Formatter } from './Formatter';
import { LogEntry } from '../entries/LogEntry';
import { FormatterError } from '../errors/LoggingErrors';
import { LogLevel } from '../levels/LogLevel';

export class PrettyFormatter implements Formatter {
  public format(entry: LogEntry): string {
    try {
      const time = new Date(entry.timestamp).toISOString();
      const levelName = (LogLevel[entry.level] || 'INFO').padEnd(5);

      let contextStr = '';
      if (entry.context) {
        const contextObj = entry.context as unknown as Record<string, unknown>;
        const keys = Object.keys(entry.context).filter((k) => k !== 'extra');
        const hasKeys = keys.some((k) => contextObj[k] !== undefined);
        const hasExtra = entry.context.extra && Object.keys(entry.context.extra).length > 0;
        if (hasKeys || hasExtra) {
          const merged = { ...entry.context };
          delete (merged as unknown as Record<string, unknown>).extra;
          if (entry.context.extra) {
            Object.assign(merged, entry.context.extra);
          }
          contextStr = ` context=${JSON.stringify(merged)}`;
        }
      }

      const metaStr =
        entry.metadata && Object.keys(entry.metadata).length > 0
          ? ` metadata=${JSON.stringify(entry.metadata)}`
          : '';

      return `[${time}] ${levelName}: ${entry.message}${contextStr}${metaStr}`;
    } catch (err: unknown) {
      const cause = err instanceof Error ? err : new Error(String(err));
      throw new FormatterError(`PrettyFormatter failed to format LogEntry: ${cause.message}`, {
        entry,
        error: cause.message,
      });
    }
  }
}
