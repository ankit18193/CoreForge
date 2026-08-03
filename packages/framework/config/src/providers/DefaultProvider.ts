import { Dictionary } from '@coreforge/types';

import { ConfigProvider } from '../types/configTypes';

export class DefaultProvider implements ConfigProvider {
  public readonly name = 'DefaultProvider';
  private _defaults: Dictionary<unknown>;

  constructor(defaults: Dictionary<unknown>) {
    this._defaults = defaults;
  }

  public async load(): Promise<Dictionary<unknown>> {
    return { ...this._defaults };
  }
}
