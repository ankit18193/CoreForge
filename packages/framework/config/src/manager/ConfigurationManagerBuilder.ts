import { ConfigurationManager } from './ConfigurationManager';
import {
  ConfigurationOptions,
  ConfigurationSource,
  EnvironmentName,
} from '../types/configurationTypes';
import { ConfigurationSchema } from '../validation/ConfigurationSchema';

export class ConfigurationManagerBuilder {
  private _environment?: EnvironmentName | string | undefined;
  private _schema?: ConfigurationSchema<unknown> | undefined;
  private _enableDiagnostics = true;
  private _failFast = true;
  private _envPrefix?: string | undefined;
  private _customProfiles?: Record<string, Record<string, unknown>> | undefined;
  private readonly _customSources: ConfigurationSource[] = [];
  private readonly _programmaticOverrides: Record<string, unknown>[] = [];

  public setEnvironment(environment: EnvironmentName | string): this {
    this._environment = environment;
    return this;
  }

  public setSchema(schema: ConfigurationSchema<unknown>): this {
    this._schema = schema;
    return this;
  }

  public setEnableDiagnostics(enable: boolean): this {
    this._enableDiagnostics = enable;
    return this;
  }

  public setFailFast(failFast: boolean): this {
    this._failFast = failFast;
    return this;
  }

  public setEnvPrefix(prefix: string): this {
    this._envPrefix = prefix;
    return this;
  }

  public setCustomProfiles(profiles: Record<string, Record<string, unknown>>): this {
    this._customProfiles = profiles;
    return this;
  }

  public addSource(source: ConfigurationSource): this {
    this._customSources.push(source);
    return this;
  }

  public addOverrides(overrides: Record<string, unknown>): this {
    this._programmaticOverrides.push(overrides);
    return this;
  }

  public build(): ConfigurationManager {
    const options: ConfigurationOptions = {
      environment: this._environment,
      schema: this._schema,
      enableDiagnostics: this._enableDiagnostics,
      failFast: this._failFast,
      envPrefix: this._envPrefix,
      customProfiles: this._customProfiles,
    };

    const manager = new ConfigurationManager(options);
    for (const src of this._customSources) {
      manager.addSource(src);
    }
    for (const ovr of this._programmaticOverrides) {
      manager.addOverrides(ovr);
    }

    return manager;
  }
}
