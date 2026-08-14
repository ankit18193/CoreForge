import { PluginConfiguration } from './PluginConfiguration';

export class PluginBuilder {
  public build(): PluginConfiguration {
    return new PluginConfiguration();
  }
}
