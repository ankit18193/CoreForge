import {
  LogErrorDescriptor,
  LoggerFactory as ILoggerFactory,
  Logger as ILogger,
  LogLevel,
  LogProcessor,
  LogRecord,
  LogSink,
  LoggingDiagnosticsSnapshot,
} from '@coreforge/contracts';

export type {
  LogErrorDescriptor,
  ILoggerFactory,
  ILogger,
  LogLevel,
  LogProcessor,
  LogRecord,
  LogSink,
  LoggingDiagnosticsSnapshot,
};

export type LoggingState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface LoggerOptions {
  readonly minimumLevel?: LogLevel | undefined;
  readonly exposeStack?: boolean | undefined;
  readonly maxCauseDepth?: number | undefined;
  readonly maxMessageLength?: number | undefined;
  readonly autoStart?: boolean | undefined;
  readonly sinks?: readonly LogSink[] | undefined;
  readonly processors?: readonly LogProcessor[] | undefined;
  readonly redactionKeys?: readonly string[] | undefined;
  readonly enableDiagnostics?: boolean | undefined;
}

export interface LogPipelineOptions {
  readonly minimumLevel?: LogLevel | undefined;
  readonly processors?: readonly LogProcessor[] | undefined;
  readonly sinks?: readonly LogSink[] | undefined;
  readonly redactionKeys?: readonly string[] | undefined;
  readonly enableDiagnostics?: boolean | undefined;
}

export interface LogRecordOptions {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown> | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly error?: unknown | undefined;
  readonly timestamp?: number | undefined;
  readonly exposeStack?: boolean | undefined;
  readonly maxCauseDepth?: number | undefined;
  readonly maxMessageLength?: number | undefined;
}
