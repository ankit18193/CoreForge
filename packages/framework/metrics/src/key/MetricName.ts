import { MetricNameError } from '../errors/MetricsErrors';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

const VALID_NAME_REGEX = /^[a-zA-Z_:][a-zA-Z0-9_:.-]*$/;

export class MetricName {
  public static validate(name: unknown): string {
    if (typeof name !== 'string') {
      throw new MetricNameError('Metric name must be a non-empty string', { name });
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new MetricNameError('Metric name cannot be empty or whitespace-only', { name });
    }

    if (hasControlCharacters(trimmed)) {
      throw new MetricNameError('Metric name contains invalid control characters', { name });
    }

    if (!VALID_NAME_REGEX.test(trimmed)) {
      throw new MetricNameError(
        'Metric name must start with a letter, underscore, or colon and contain only alphanumeric, underscore, colon, dot, or hyphen characters',
        { name: trimmed },
      );
    }

    return trimmed;
  }
}
