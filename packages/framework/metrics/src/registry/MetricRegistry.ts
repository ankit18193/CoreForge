import { MetricDefinition, MetricType } from '@coreforge/contracts';

import { MetricRegistrationError, MetricTypeError } from '../errors/MetricsErrors';
import { MetricName } from '../key/MetricName';

const VALID_TYPES = new Set<MetricType>(['COUNTER', 'GAUGE', 'HISTOGRAM', 'TIMER']);

export const DEFAULT_HISTOGRAM_BUCKETS: readonly number[] = Object.freeze([
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
]);

export class MetricRegistry {
  private readonly _definitions = new Map<string, MetricDefinition>();

  public register(definition: MetricDefinition): MetricDefinition {
    if (!definition || typeof definition !== 'object') {
      throw new MetricRegistrationError('Metric definition must be an object', { definition });
    }

    const validName = MetricName.validate(definition.name);

    if (!definition.type || !VALID_TYPES.has(definition.type)) {
      throw new MetricTypeError(
        `Invalid metric type "${definition.type}": must be COUNTER, GAUGE, HISTOGRAM, or TIMER`,
        { type: definition.type },
      );
    }

    let histogramOptions = definition.histogram;
    if (definition.type === 'HISTOGRAM' || definition.type === 'TIMER') {
      if (histogramOptions?.buckets) {
        if (!Array.isArray(histogramOptions.buckets) || histogramOptions.buckets.length === 0) {
          throw new MetricRegistrationError(
            'Histogram buckets must be a non-empty array of numbers',
            {
              buckets: histogramOptions.buckets,
            },
          );
        }
        const sorted = [...histogramOptions.buckets].sort((a, b) => a - b);
        histogramOptions = Object.freeze({ buckets: Object.freeze(sorted) });
      } else {
        histogramOptions = Object.freeze({ buckets: DEFAULT_HISTOGRAM_BUCKETS });
      }
    }

    const existing = this._definitions.get(validName);
    if (existing) {
      // Check compatibility
      if (existing.type !== definition.type) {
        throw new MetricRegistrationError(
          `Incompatible metric re-registration for "${validName}": existing type is ${existing.type}, attempted ${definition.type}`,
          { name: validName, existingType: existing.type, newType: definition.type },
        );
      }

      if (
        (existing.type === 'HISTOGRAM' || existing.type === 'TIMER') &&
        definition.histogram?.buckets &&
        existing.histogram
      ) {
        const existingBuckets = existing.histogram.buckets.join(',');
        const newBuckets = histogramOptions?.buckets?.join(',');
        if (newBuckets && existingBuckets !== newBuckets) {
          throw new MetricRegistrationError(`Incompatible histogram buckets for "${validName}"`, {
            name: validName,
            existingBuckets,
            newBuckets,
          });
        }
      }

      return existing; // Idempotent
    }

    const validDef: MetricDefinition = Object.freeze({
      name: validName,
      type: definition.type,
      description: definition.description,
      histogram: histogramOptions,
    });

    this._definitions.set(validName, validDef);
    return validDef;
  }

  public get(name: string): MetricDefinition | undefined {
    const validName = MetricName.validate(name);
    return this._definitions.get(validName);
  }

  public getAll(): readonly MetricDefinition[] {
    return Array.from(this._definitions.values());
  }

  public clear(): void {
    this._definitions.clear();
  }
}
