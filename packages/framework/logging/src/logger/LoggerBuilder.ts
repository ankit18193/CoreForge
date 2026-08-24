import { Logger } from './Logger';
import { LogPipelineBuilder } from '../pipeline/LogPipelineBuilder';
import { LogLevel, LogProcessor, LogSink } from '../types/loggingTypes';

export class LoggerBuilder {
  private readonly _pipelineBuilder = new LogPipelineBuilder();
  private _exposeStack = true;
  private _maxCauseDepth = 5;
  private _maxMessageLength?: number | undefined;
  private _autoStart = true;
  private _context: Record<string, unknown> = {};

  public setMinimumLevel(level: LogLevel): this {
    this._pipelineBuilder.setMinimumLevel(level);
    return this;
  }

  public addProcessor(processor: LogProcessor): this {
    this._pipelineBuilder.addProcessor(processor);
    return this;
  }

  public addSink(sink: LogSink): this {
    this._pipelineBuilder.addSink(sink);
    return this;
  }

  public addWriter(sinkOrWriter: LogSink): this {
    return this.addSink(sinkOrWriter);
  }

  public setFormatter(_formatter: unknown): this {
    return this;
  }

  public addRedactionKey(key: string): this {
    this._pipelineBuilder.addRedactionKey(key);
    return this;
  }

  public setExposeStack(expose: boolean): this {
    this._exposeStack = expose;
    return this;
  }

  public setMaxCauseDepth(depth: number): this {
    this._maxCauseDepth = depth;
    return this;
  }

  public setMaxMessageLength(length: number): this {
    this._maxMessageLength = length;
    return this;
  }

  public setAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public setContext(context: Record<string, unknown>): this {
    this._context = context;
    return this;
  }

  public build(): Logger {
    const pipeline = this._pipelineBuilder.build();
    return new Logger(pipeline, this._context, {
      exposeStack: this._exposeStack,
      maxCauseDepth: this._maxCauseDepth,
      maxMessageLength: this._maxMessageLength,
      autoStart: this._autoStart,
    });
  }
}
