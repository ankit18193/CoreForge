import { EnvironmentName } from '../types/configurationTypes';

export class EnvironmentProfile {
  private readonly _profiles: Map<EnvironmentName, Readonly<Record<string, unknown>>>;

  constructor(customProfiles: Partial<Record<EnvironmentName, Record<string, unknown>>> = {}) {
    this._profiles = new Map();

    // Default built-in profiles
    this._profiles.set(
      'development',
      Object.freeze({
        env: 'development',
        debug: true,
        logging: { level: 'debug' },
      }),
    );

    this._profiles.set(
      'test',
      Object.freeze({
        env: 'test',
        debug: true,
        logging: { level: 'warn' },
      }),
    );

    this._profiles.set(
      'staging',
      Object.freeze({
        env: 'staging',
        debug: false,
        logging: { level: 'info' },
      }),
    );

    this._profiles.set(
      'production',
      Object.freeze({
        env: 'production',
        debug: false,
        logging: { level: 'error' },
      }),
    );

    // Apply custom profile overrides
    for (const [env, profileData] of Object.entries(customProfiles)) {
      if (profileData && typeof profileData === 'object') {
        const existing = this._profiles.get(env as EnvironmentName) || {};
        this._profiles.set(env as EnvironmentName, Object.freeze({ ...existing, ...profileData }));
      }
    }
  }

  public getProfile(environment: EnvironmentName): Readonly<Record<string, unknown>> {
    return this._profiles.get(environment) || Object.freeze({ env: environment });
  }
}
