import { Dictionary } from '@coreforge/types';

import { Config } from '../config/Config';
import { ConfigurationBuilder } from '../config/ConfigurationBuilder';
import { ConfigurationMapper } from '../mapper/ConfigurationMapper';
import { ConfigProvider } from '../types/configTypes';
import { ConfigSchema } from '../validator/ConfigSchema';
import { ConfigurationValidator } from '../validator/ConfigurationValidator';

export class ConfigurationLoader {
  private _providers: ConfigProvider[] = [];
  private _mapper: ConfigurationMapper;
  private _validator: ConfigurationValidator;
  private _builder: ConfigurationBuilder;

  constructor(schema: ConfigSchema) {
    this._mapper = new ConfigurationMapper();
    this._validator = new ConfigurationValidator(schema);
    this._builder = new ConfigurationBuilder();
  }

  public registerProvider(provider: ConfigProvider): void {
    this._providers.push(provider);
  }

  public async load(): Promise<Config> {
    const merged: Dictionary<unknown> = {};

    for (const provider of this._providers) {
      const data = await provider.load();
      Object.assign(merged, data);
    }

    const validatedFlat = this._validator.validate(merged);
    const nested = this._mapper.map(validatedFlat);

    return this._builder.build(nested);
  }
}
