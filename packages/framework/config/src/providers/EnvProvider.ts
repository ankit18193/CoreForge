import { Dictionary } from '@coreforge/types';

import { ConfigProvider } from '../types/configTypes';

export class EnvProvider implements ConfigProvider {
  public readonly name = 'EnvProvider';
  private _mappings: Dictionary<string>;

  constructor(mappings: Dictionary<string>) {
    this._mappings = mappings;
  }

  public async load(): Promise<Dictionary<unknown>> {
    const result: Dictionary<unknown> = {};
    for (const [configPath, envVarName] of Object.entries(this._mappings)) {
      const val = process.env[envVarName];
      if (val !== undefined) {
        result[configPath] = val;
      }
    }
    return result;
  }
}
