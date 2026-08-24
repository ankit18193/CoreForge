import { MetricLabels as IMetricLabels } from '@coreforge/contracts';

import { MetricLabelError } from '../errors/MetricsErrors';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

const VALID_LABEL_KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class MetricLabelValidator {
  public static validate(labels?: unknown): IMetricLabels {
    if (!labels) {
      return Object.freeze({});
    }

    if (typeof labels !== 'object' || Array.isArray(labels)) {
      throw new MetricLabelError('Metric labels must be a key-value object', { labels });
    }

    const normalized: Record<string, string> = {};
    const keys = Object.keys(labels as Record<string, unknown>).sort();

    for (const key of keys) {
      const trimmedKey = key.trim();
      if (trimmedKey.length === 0 || !VALID_LABEL_KEY_REGEX.test(trimmedKey)) {
        throw new MetricLabelError(
          `Invalid label key "${key}": must start with letter/underscore and contain only alphanumeric/underscore`,
          { key },
        );
      }

      if (hasControlCharacters(trimmedKey)) {
        throw new MetricLabelError(`Label key contains invalid control characters: "${key}"`, {
          key,
        });
      }

      const val = (labels as Record<string, unknown>)[key];
      if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
        throw new MetricLabelError(
          `Invalid label value for "${key}": must be string, number, or boolean`,
          { key, value: val },
        );
      }

      const strVal = String(val);
      if (hasControlCharacters(strVal)) {
        throw new MetricLabelError(`Label value for "${key}" contains invalid control characters`, {
          key,
          value: strVal,
        });
      }

      normalized[trimmedKey] = strVal;
    }

    return Object.freeze(normalized);
  }

  public static serialize(labels: IMetricLabels): string {
    const keys = Object.keys(labels).sort();
    if (keys.length === 0) {
      return '';
    }
    return keys.map((k) => `${k}="${labels[k]}"`).join(',');
  }
}
