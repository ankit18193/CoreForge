import { ConfigurationSourceError } from '../errors/ConfigurationErrors';
import { ConfigurationSource } from '../types/configurationTypes';
import { ConfigurationSchema } from '../validation/ConfigurationSchema';
import { ConfigurationValidator } from '../validation/ConfigurationValidator';

export class ConfigurationLoader {
  private readonly _sources: ConfigurationSource[] = [];
  private readonly _schema?: ConfigurationSchema<unknown> | undefined;

  constructor(schema?: ConfigurationSchema<unknown>) {
    this._schema = schema;
  }

  public registerSource(source: ConfigurationSource): this {
    this._sources.push(source);
    return this;
  }

  public registerProvider(source: ConfigurationSource): this {
    return this.registerSource(source);
  }

  public get sources(): readonly ConfigurationSource[] {
    return this._sources;
  }

  public async load(): Promise<Record<string, unknown>> {
    let merged: Record<string, unknown> = {};

    for (const source of this._sources) {
      try {
        const loaded = await Promise.resolve(source.load());
        if (loaded && typeof loaded === 'object') {
          merged = this._deepMerge(merged, loaded as Record<string, unknown>);
        }
      } catch (err) {
        if (err instanceof ConfigurationSourceError) {
          throw err;
        }
        throw new ConfigurationSourceError(
          source.name || 'UnknownSource',
          err instanceof Error ? err.message : String(err),
          err,
        );
      }
    }

    // Run schema validation
    return ConfigurationValidator.validate(merged, this._schema);
  }

  private _deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };

    for (const [key, sourceVal] of Object.entries(source)) {
      const targetVal = result[key];

      if (
        sourceVal &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        targetVal &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        result[key] = this._deepMerge(
          targetVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>,
        );
      } else if (Array.isArray(sourceVal)) {
        result[key] = Object.freeze([...sourceVal]);
      } else if (sourceVal && typeof sourceVal === 'object') {
        result[key] = JSON.parse(JSON.stringify(sourceVal));
      } else {
        result[key] = sourceVal;
      }
    }

    return result;
  }
}
