import { PluginContext as IPluginContext } from '@coreforge/contracts';

import { PluginCapabilities } from './PluginCapabilities';

export class PluginContext implements IPluginContext {
  public readonly capabilities: PluginCapabilities;

  constructor(capabilities: PluginCapabilities) {
    this.capabilities = capabilities;
  }
}
