// Types
export * from './types/loggingTypes';

// Errors
export * from './errors/LoggingErrors';

// Levels
export * from './logger/LogLevel';

// Security
export * from './security/LogSecretMasker';

// Context
export * from './context/LogContext';
export * from './context/LogContextManager';

// Record
export * from './record/LogErrorSerializer';
export * from './record/LogRecord';
export * from './record/LogRecordFactory';

// Processors
export * from './processor/LogProcessor';
export * from './processor/MetadataProcessor';
export * from './processor/RedactionProcessor';

// Sinks
export * from './sink/LogSink';
export * from './sink/ConsoleLogSink';
export * from './sink/MemoryLogSink';

// Diagnostics
export * from './diagnostics/LoggingDiagnostics';

// Lifecycle
export * from './lifecycle/LoggingState';
export * from './lifecycle/LoggingLifecycleManager';

// Pipeline
export * from './pipeline/LogPipelineResult';
export * from './pipeline/LogPipeline';
export * from './pipeline/LogPipelineBuilder';

// Logger
export * from './logger/Logger';
export * from './logger/LoggerFactory';
export * from './logger/ChildLogger';
export * from './logger/LoggerBuilder';

// Backward Compatibility Aliases for Bootstrap
export { ConsoleLogSink as ConsoleWriter } from './sink/ConsoleLogSink';
export class PrettyFormatter {
  public format<T>(record: T): T {
    return record;
  }
}
