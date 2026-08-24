import { LoggingDiagnostics } from '../diagnostics/LoggingDiagnostics';
import { LoggingProfiler } from '../internal/LoggingProfiler';
import { LogLevelUtil } from '../logger/LogLevel';
import { RedactionProcessor } from '../processor/RedactionProcessor';
import {
  LogLevel,
  LogPipelineOptions,
  LogProcessor,
  LogRecord,
  LogSink,
  LoggingDiagnosticsSnapshot,
} from '../types/loggingTypes';

export class LogPipeline {
  private readonly _minimumLevel: LogLevel;
  private readonly _processors: readonly LogProcessor[];
  private readonly _sinks: readonly LogSink[];
  private readonly _mandatoryRedaction: RedactionProcessor;
  private readonly _diagnostics: LoggingDiagnostics;
  private readonly _enableDiagnostics: boolean;

  constructor(options: LogPipelineOptions = {}) {
    this._minimumLevel = options.minimumLevel ?? 'INFO';
    this._processors = Object.freeze([...(options.processors || [])]);
    this._sinks = Object.freeze([...(options.sinks || [])]);
    this._mandatoryRedaction = new RedactionProcessor(options.redactionKeys);
    this._diagnostics = new LoggingDiagnostics();
    this._enableDiagnostics = options.enableDiagnostics ?? true;
  }

  public get minimumLevel(): LogLevel {
    return this._minimumLevel;
  }

  public get sinks(): readonly LogSink[] {
    return this._sinks;
  }

  public get processors(): readonly LogProcessor[] {
    return this._processors;
  }

  public get diagnostics(): LoggingDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public execute(initialRecord: LogRecord): void {
    // 1. Level check
    if (!LogLevelUtil.isLogLevelEnabled(this._minimumLevel, initialRecord.level)) {
      return;
    }

    const profiler = new LoggingProfiler();
    let currentRecord = initialRecord;

    // 2. User Processors with failure isolation
    for (const processor of this._processors) {
      try {
        const result = processor.process(currentRecord);
        // If processor returned a sync LogRecord
        if (result && typeof result === 'object') {
          currentRecord = result as LogRecord;
        }
      } catch {
        if (this._enableDiagnostics) {
          this._diagnostics.recordProcessorFailure();
        }
        // Skip failed processor and continue with previous valid record
      }
    }

    // 3. Mandatory Redaction (produces fresh sanitized LogRecord)
    let sanitizedRecord: LogRecord;
    try {
      sanitizedRecord = this._mandatoryRedaction.process(currentRecord);
    } catch {
      sanitizedRecord = currentRecord;
    }

    // 4. Sink dispatch with isolation (synchronous API, non-blocking async handles)
    for (const sink of this._sinks) {
      try {
        const writeRes = sink.write(sanitizedRecord);
        if (writeRes && typeof (writeRes as Promise<void>).catch === 'function') {
          (writeRes as Promise<void>).catch(() => {
            if (this._enableDiagnostics) {
              this._diagnostics.recordSinkFailure();
            }
          });
        }
      } catch {
        if (this._enableDiagnostics) {
          this._diagnostics.recordSinkFailure();
        }
      }
    }

    const durationMs = profiler.stop();
    if (this._enableDiagnostics) {
      this._diagnostics.recordLog(sanitizedRecord.level, durationMs);
    }
  }

  public async flush(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const sink of this._sinks) {
      if (typeof sink.flush === 'function') {
        try {
          const res = sink.flush();
          if (res && typeof (res as Promise<void>).then === 'function') {
            promises.push(
              (res as Promise<void>).catch(() => {
                if (this._enableDiagnostics) {
                  this._diagnostics.recordSinkFailure();
                }
              }),
            );
          }
        } catch {
          if (this._enableDiagnostics) {
            this._diagnostics.recordSinkFailure();
          }
        }
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  public async close(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const sink of this._sinks) {
      if (typeof sink.close === 'function') {
        try {
          const res = sink.close();
          if (res && typeof (res as Promise<void>).then === 'function') {
            promises.push(
              (res as Promise<void>).catch(() => {
                if (this._enableDiagnostics) {
                  this._diagnostics.recordSinkFailure();
                }
              }),
            );
          }
        } catch {
          if (this._enableDiagnostics) {
            this._diagnostics.recordSinkFailure();
          }
        }
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }
}
