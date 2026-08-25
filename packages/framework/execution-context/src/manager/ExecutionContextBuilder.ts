import { ExecutionContextManager } from './ExecutionContextManager';
import { ExecutionContextConfig, ExecutionMetadataConfig } from '../types/executionContextTypes';

export class ExecutionContextBuilder {
  private _defaultMetadata?: Readonly<Record<string, unknown>> | undefined;
  private _metadataLimits?: ExecutionMetadataConfig | undefined;
  private _autoStart = false;

  public withDefaultMetadata(metadata: Readonly<Record<string, unknown>>): this {
    this._defaultMetadata = metadata;
    return this;
  }

  public withMetadataLimits(limits: ExecutionMetadataConfig): this {
    this._metadataLimits = limits;
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): ExecutionContextManager {
    const config: ExecutionContextConfig = {
      defaultMetadata: this._defaultMetadata,
      metadataLimits: this._metadataLimits,
      autoStart: this._autoStart,
    };

    return new ExecutionContextManager(config);
  }
}
