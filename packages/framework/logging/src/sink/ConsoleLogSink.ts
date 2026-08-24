import { LogRecord, LogSink } from '../types/loggingTypes';

export interface ConsoleLogSinkOptions {
  readonly name?: string | undefined;
  readonly outStream?: { write(str: string): void } | undefined;
  readonly errStream?: { write(str: string): void } | undefined;
}

export class ConsoleLogSink implements LogSink {
  public readonly name: string;
  private readonly _outStream: { write(str: string): void };
  private readonly _errStream: { write(str: string): void };

  constructor(options: ConsoleLogSinkOptions = {}) {
    this.name = options.name || 'ConsoleLogSink';
    this._outStream =
      options.outStream || (typeof process !== 'undefined' ? process.stdout : { write: () => {} });
    this._errStream =
      options.errStream || (typeof process !== 'undefined' ? process.stderr : { write: () => {} });
  }

  public write(record: LogRecord): void {
    const serialized = JSON.stringify(record) + '\n';
    if (record.level === 'ERROR' || record.level === 'FATAL') {
      this._errStream.write(serialized);
    } else {
      this._outStream.write(serialized);
    }
  }

  public flush(): void {
    // Synchronous stream flush
  }

  public close(): void {
    // No-op for standard streams
  }
}
