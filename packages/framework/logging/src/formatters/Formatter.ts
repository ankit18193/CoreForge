import { LogEntry } from '../entries/LogEntry';

export interface Formatter {
  format(entry: LogEntry): string;
}
