import { PluginIndex } from './PluginIndex';

export class PluginRegistry {
  public readonly registered = new PluginIndex();
  public readonly enabled = new Set<string>();
  public readonly disabled = new Set<string>();
}
