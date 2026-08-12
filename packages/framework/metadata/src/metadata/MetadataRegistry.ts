import {
  MetadataDescriptor as IMetadataDescriptor,
  MetadataRegistry as IMetadataRegistry,
  MetadataType,
} from '@coreforge/contracts';

import { MetadataConfiguration } from './MetadataConfiguration';
import { MetadataRegistryManager } from './MetadataRegistryManager';
import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';
import { MetadataDiagnostics } from '../diagnostics/MetadataDiagnostics';
import { MetadataLifecycleManager } from '../lifecycle/MetadataLifecycleManager';
import { MetadataState } from '../lifecycle/MetadataState';
import { MetadataResolver } from '../resolver/MetadataResolver';

export class MetadataRegistry implements IMetadataRegistry {
  private readonly _config: MetadataConfiguration;
  private readonly _lifecycle = new MetadataLifecycleManager();
  private readonly _diagnostics = new MetadataDiagnostics();

  private readonly _registryManager: MetadataRegistryManager;
  private readonly _resolver: MetadataResolver;

  constructor(config: MetadataConfiguration) {
    this._config = config;
    this._registryManager = new MetadataRegistryManager(
      config.store,
      config.index,
      this._lifecycle,
      this._diagnostics,
    );
    this._resolver = new MetadataResolver(config.index, this._diagnostics);

    this._lifecycle.transitionTo(MetadataState.REGISTERING);
  }

  public get state(): MetadataState {
    return this._lifecycle.state;
  }

  public get diagnostics(): MetadataDiagnostics {
    return this._diagnostics;
  }

  public get index() {
    return this._config.index;
  }

  public get resolver(): MetadataResolver {
    return this._resolver;
  }

  public makeReady(): void {
    if (this._lifecycle.state === MetadataState.READY) {
      return;
    }

    this._lifecycle.transitionTo(MetadataState.READY);

    const list = this._config.store.getDescriptors();
    for (const desc of list) {
      Object.freeze(desc);
    }
  }

  public stop(): void {
    if (this._lifecycle.state === MetadataState.STOPPED) {
      return;
    }
    this._lifecycle.transitionTo(MetadataState.STOPPED);
  }

  public register(descriptor: IMetadataDescriptor): void {
    this._registryManager.register(descriptor as MetadataDescriptor);
  }

  public resolve(type: MetadataType): readonly IMetadataDescriptor[] {
    return this._resolver.query({ type });
  }
}
