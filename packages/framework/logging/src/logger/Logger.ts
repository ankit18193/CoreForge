import { LogContextManager } from '../context/LogContextManager';
import { LoggingLifecycleManager } from '../lifecycle/LoggingLifecycleManager';
import { LogPipeline } from '../pipeline/LogPipeline';
import { LogRecordFactory } from '../record/LogRecordFactory';
import {
  ILogger,
  LogLevel,
  LoggerOptions,
  LoggingDiagnosticsSnapshot,
  LoggingState,
} from '../types/loggingTypes';

export class Logger implements ILogger {
  private readonly _pipeline: LogPipeline;
  private readonly _recordFactory: LogRecordFactory;
  private readonly _lifecycle: LoggingLifecycleManager;
  private readonly _context: Readonly<Record<string, unknown>>;
  private readonly _autoStart: boolean;

  constructor(
    pipeline: LogPipeline,
    context: Record<string, unknown> = {},
    options: LoggerOptions = {},
    lifecycle?: LoggingLifecycleManager,
  ) {
    this._pipeline = pipeline;
    this._context = LogContextManager.createContext(context);
    this._autoStart = options.autoStart ?? true;
    this._lifecycle = lifecycle ?? new LoggingLifecycleManager();
    this._recordFactory = new LogRecordFactory({
      exposeStack: options.exposeStack,
      maxCauseDepth: options.maxCauseDepth,
      maxMessageLength: options.maxMessageLength,
    });

    if (this._autoStart && this._lifecycle.state === 'CREATED') {
      this._lifecycle.setReady();
    }
  }

  public get state(): LoggingState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.ready;
  }

  public get context(): Readonly<Record<string, unknown>> {
    return this._context;
  }

  public get pipeline(): LogPipeline {
    return this._pipeline;
  }

  public get diagnostics(): LoggingDiagnosticsSnapshot {
    return this._pipeline.diagnostics;
  }

  public start(): void {
    this._lifecycle.setReady();
  }

  public async stop(): Promise<void> {
    this._lifecycle.setStopping();
    await this._pipeline.flush();
    await this._pipeline.close();
    this._lifecycle.setStopped();
  }

  public trace(message: string, metadata?: Record<string, unknown>): void {
    this._log('TRACE', message, metadata);
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this._log('DEBUG', message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this._log('INFO', message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this._log('WARN', message, metadata);
  }

  public error(
    message: string,
    metadataOrError?: Record<string, unknown> | unknown,
    error?: unknown,
  ): void {
    const { metadata, err } = this._resolveMetadataAndError(metadataOrError, error);
    this._log('ERROR', message, metadata, err);
  }

  public fatal(
    message: string,
    metadataOrError?: Record<string, unknown> | unknown,
    error?: unknown,
  ): void {
    const { metadata, err } = this._resolveMetadataAndError(metadataOrError, error);
    this._log('FATAL', message, metadata, err);
  }

  public child(childContext: Record<string, unknown>): Logger {
    const mergedContext = LogContextManager.createChild(this._context, childContext);
    return new Logger(
      this._pipeline,
      mergedContext,
      {
        autoStart: this._autoStart,
      },
      this._lifecycle,
    );
  }

  private _log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: unknown,
  ): void {
    if (!this._lifecycle.assertCanLog(this._autoStart)) {
      return;
    }

    try {
      const record = this._recordFactory.create({
        level,
        message,
        context: this._context,
        metadata,
        error,
      });

      this._pipeline.execute(record);
    } catch (err) {
      if (err instanceof Error && err.name === 'LoggingSerializationError') {
        throw err;
      }
      // Pipeline failures must not crash application execution
    }
  }

  private _resolveMetadataAndError(
    metadataOrError?: Record<string, unknown> | unknown,
    error?: unknown,
  ): { metadata?: Record<string, unknown> | undefined; err?: unknown } {
    if (error !== undefined) {
      const meta =
        typeof metadataOrError === 'object' &&
        metadataOrError !== null &&
        !(metadataOrError instanceof Error)
          ? (metadataOrError as Record<string, unknown>)
          : undefined;
      return {
        metadata: meta,
        err: error,
      };
    }

    if (metadataOrError instanceof Error) {
      return { err: metadataOrError };
    }

    if (typeof metadataOrError === 'object' && metadataOrError !== null) {
      return { metadata: metadataOrError as Record<string, unknown> };
    }

    if (metadataOrError !== undefined) {
      return { err: metadataOrError };
    }

    return {};
  }
}
