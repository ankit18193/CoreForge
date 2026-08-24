import { LogPipeline } from './LogPipeline';
import { LogLevel, LogPipelineOptions, LogProcessor, LogSink } from '../types/loggingTypes';

export class LogPipelineBuilder {
  private _minimumLevel?: LogLevel | undefined;
  private readonly _processors: LogProcessor[] = [];
  private readonly _sinks: LogSink[] = [];
  private readonly _redactionKeys: string[] = [];
  private _enableDiagnostics = true;

  public setMinimumLevel(level: LogLevel): this {
    this._minimumLevel = level;
    return this;
  }

  public addProcessor(processor: LogProcessor): this {
    this._processors.push(processor);
    return this;
  }

  public addSink(sink: LogSink): this {
    this._sinks.push(sink);
    return this;
  }

  public addRedactionKey(key: string): this {
    this._redactionKeys.push(key);
    return this;
  }

  public setEnableDiagnostics(enable: boolean): this {
    this._enableDiagnostics = enable;
    return this;
  }

  public build(): LogPipeline {
    const options: LogPipelineOptions = {
      minimumLevel: this._minimumLevel,
      processors: this._processors,
      sinks: this._sinks,
      redactionKeys: this._redactionKeys,
      enableDiagnostics: this._enableDiagnostics,
    };

    return new LogPipeline(options);
  }
}
