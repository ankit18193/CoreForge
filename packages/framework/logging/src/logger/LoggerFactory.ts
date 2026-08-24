import { Logger } from './Logger';
import { LogPipeline } from '../pipeline/LogPipeline';
import { ILoggerFactory, LoggerOptions, LogPipelineOptions } from '../types/loggingTypes';

export class LoggerFactory implements ILoggerFactory {
  private readonly _pipeline: LogPipeline;
  private readonly _options: LoggerOptions;

  constructor(options: LoggerOptions & LogPipelineOptions = {}) {
    this._pipeline = new LogPipeline(options);
    this._options = options;
  }

  public get pipeline(): LogPipeline {
    return this._pipeline;
  }

  public create(context: Record<string, unknown> = {}): Logger {
    return new Logger(this._pipeline, context, this._options);
  }
}
