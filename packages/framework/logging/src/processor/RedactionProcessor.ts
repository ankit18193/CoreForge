import { LogSecretMasker } from '../security/LogSecretMasker';
import { LogProcessor, LogRecord } from '../types/loggingTypes';

export class RedactionProcessor implements LogProcessor {
  public readonly name = 'RedactionProcessor';
  private readonly _masker: LogSecretMasker;

  constructor(customKeys: readonly string[] = []) {
    this._masker = new LogSecretMasker(customKeys);
  }

  public process(record: LogRecord): LogRecord {
    const sanitizedContext = this._masker.mask(record.context) as Readonly<Record<string, unknown>>;
    const sanitizedMetadata = record.metadata
      ? (this._masker.mask(record.metadata) as Readonly<Record<string, unknown>>)
      : undefined;

    let sanitizedError = record.error;
    if (record.error) {
      sanitizedError = Object.freeze({
        ...record.error,
        message: this._masker.isSensitiveKey(record.error.name)
          ? '[REDACTED]'
          : record.error.message,
      });
    }

    return Object.freeze({
      timestamp: record.timestamp,
      level: record.level,
      message: record.message,
      context: sanitizedContext,
      metadata: sanitizedMetadata,
      error: sanitizedError,
    });
  }
}
