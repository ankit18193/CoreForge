import { LogProcessor, LogRecord } from '../types/loggingTypes';

export class MetadataProcessor implements LogProcessor {
  public readonly name = 'MetadataProcessor';

  public process(record: LogRecord): LogRecord {
    if (!record.metadata) {
      return record;
    }

    return Object.freeze({
      ...record,
      metadata: Object.freeze({ ...record.metadata }),
    });
  }
}
