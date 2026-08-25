import { TraceSamplingError, TracingConfigurationError } from '../errors/TracingErrors';
import { TraceSamplerConfig, TraceSamplerType } from '../types/tracingTypes';

export class TraceSampler {
  private readonly _type: TraceSamplerType;
  private readonly _probability: number;

  constructor(config: TraceSamplerConfig = { type: 'ALWAYS' }) {
    if (
      !config.type ||
      (config.type !== 'ALWAYS' && config.type !== 'NEVER' && config.type !== 'PROBABILISTIC')
    ) {
      throw new TracingConfigurationError(
        `Invalid sampler type "${config.type}": must be ALWAYS, NEVER, or PROBABILISTIC`,
        { config },
      );
    }

    this._type = config.type;

    if (this._type === 'PROBABILISTIC') {
      const prob = config.probability ?? 1.0;
      if (typeof prob !== 'number' || !Number.isFinite(prob) || prob < 0 || prob > 1) {
        throw new TraceSamplingError(
          'Probabilistic sampler probability must be a number between 0 and 1 (inclusive)',
          { probability: prob },
        );
      }
      this._probability = prob;
    } else {
      this._probability = this._type === 'ALWAYS' ? 1.0 : 0.0;
    }
  }

  public get type(): TraceSamplerType {
    return this._type;
  }

  public get probability(): number {
    return this._probability;
  }

  public shouldSample(explicitSampled?: boolean): boolean {
    if (explicitSampled !== undefined) {
      return Boolean(explicitSampled);
    }

    if (this._type === 'ALWAYS') {
      return true;
    }

    if (this._type === 'NEVER') {
      return false;
    }

    // PROBABILISTIC
    if (this._probability <= 0) {
      return false;
    }
    if (this._probability >= 1) {
      return true;
    }

    return Math.random() < this._probability;
  }
}
