import { TraceProvider } from '@coreforge/contracts';

import { TraceManager } from './TraceManager';
import { TraceLimitsConfig, TraceSamplerConfig, TracingOptions } from '../types/tracingTypes';

export class TraceBuilder {
  private _provider?: TraceProvider | undefined;
  private _sampler?: TraceSamplerConfig | undefined;
  private _limits?: TraceLimitsConfig | undefined;
  private _maxStoredTraces?: number | undefined;
  private _maxStoredSpansPerTrace?: number | undefined;
  private _autoStart = true;

  public provider(provider: TraceProvider): this {
    this._provider = provider;
    return this;
  }

  public sampler(sampler: TraceSamplerConfig): this {
    this._sampler = sampler;
    return this;
  }

  public limits(limits: TraceLimitsConfig): this {
    this._limits = limits;
    return this;
  }

  public maxStoredTraces(maxStoredTraces: number): this {
    this._maxStoredTraces = maxStoredTraces;
    return this;
  }

  public maxStoredSpansPerTrace(maxStoredSpansPerTrace: number): this {
    this._maxStoredSpansPerTrace = maxStoredSpansPerTrace;
    return this;
  }

  public autoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): TraceManager {
    const options: TracingOptions = {
      sampler: this._sampler,
      limits: this._limits,
      maxStoredTraces: this._maxStoredTraces,
      maxStoredSpansPerTrace: this._maxStoredSpansPerTrace,
      autoStart: this._autoStart,
    };

    return new TraceManager(options, this._provider);
  }
}
