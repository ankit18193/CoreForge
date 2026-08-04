import { LogEntry } from '../entries/LogEntry';

export interface LogFilter {
  shouldLog(entry: LogEntry): boolean;
}

export class FilterPipeline implements LogFilter {
  private readonly _filters: LogFilter[] = [];

  constructor(filters?: LogFilter[]) {
    if (filters) {
      this._filters.push(...filters);
    }
  }

  public addFilter(filter: LogFilter): void {
    this._filters.push(filter);
  }

  public shouldLog(entry: LogEntry): boolean {
    for (const filter of this._filters) {
      if (!filter.shouldLog(entry)) {
        return false;
      }
    }
    return true;
  }
}
