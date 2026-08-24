import { ConfigurationValidationError } from '../errors/ConfigurationErrors';
import { EnvironmentName } from '../types/configurationTypes';

export class EnvironmentResolver {
  public static readonly ALLOWED_ENVIRONMENTS: readonly EnvironmentName[] = Object.freeze([
    'development',
    'test',
    'staging',
    'production',
  ]);

  public static resolve(explicitEnv?: string): EnvironmentName {
    let rawEnv = explicitEnv;

    if (!rawEnv && typeof process !== 'undefined' && process.env) {
      rawEnv = process.env.COREFORGE_ENV || process.env.NODE_ENV;
    }

    if (!rawEnv || typeof rawEnv !== 'string' || rawEnv.trim().length === 0) {
      return 'development';
    }

    const normalized = rawEnv.trim().toLowerCase();

    // Map common aliases
    if (normalized === 'dev') {
      return 'development';
    }
    if (normalized === 'testing') {
      return 'test';
    }
    if (normalized === 'prod') {
      return 'production';
    }
    if (normalized === 'stage') {
      return 'staging';
    }

    if (!this.ALLOWED_ENVIRONMENTS.includes(normalized as EnvironmentName)) {
      throw new ConfigurationValidationError(
        `Invalid environment '${rawEnv}'. Expected one of: ${this.ALLOWED_ENVIRONMENTS.join(', ')}.`,
        'environment',
      );
    }

    return normalized as EnvironmentName;
  }
}
