import { LogRecord, LogSink } from '../types/loggingTypes';

/**
 * MemoryLogSink is intended exclusively for testing, development, and inspection purposes.
 * It must NOT be used in production environments as an unbounded log storage mechanism.
 */
export class MemoryLogSink implements LogSink {
  public readonly name: string;
  private _records: LogRecord[] = [];

  constructor(name = 'MemoryLogSink') {
    this.name = name;
  }

  public write(record: LogRecord): void {
    this._records.push(record);
  }

  public records(): readonly LogRecord[] {
    return Object.freeze([...this._records]);
  }

  public clear(): void {
    this._records = [];
  }

  public flush(): void {
    // In-memory flush is immediate
  }

  public close(): void {
    this._records = [];
  }
}
