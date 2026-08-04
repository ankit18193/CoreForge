import { LogEntry } from '../entries/LogEntry';

export interface Writer {
  write(formattedEntry: string, entry: LogEntry): Promise<void> | void;
}
