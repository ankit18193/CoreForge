import { PluginOptions } from './PluginOptions';

export class PluginConfiguration {
  constructor(options?: PluginOptions) {
    Object.freeze(options);
    Object.freeze(this);
  }
}
