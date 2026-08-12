import { MetadataIndex } from './MetadataIndex';
import { MetadataStore } from './MetadataStore';
import { MetadataDescriptor } from '../descriptors/MetadataDescriptor';
import { MetadataDiagnostics } from '../diagnostics/MetadataDiagnostics';
import { MetadataDuplicateError, MetadataStateError } from '../errors/MetadataErrors';
import { MetadataLifecycleManager } from '../lifecycle/MetadataLifecycleManager';
import { MetadataState } from '../lifecycle/MetadataState';

export class MetadataRegistryManager {
  private readonly _store: MetadataStore;
  private readonly _index: MetadataIndex;
  private readonly _lifecycle: MetadataLifecycleManager;
  private readonly _diagnostics: MetadataDiagnostics;

  constructor(
    store: MetadataStore,
    index: MetadataIndex,
    lifecycle: MetadataLifecycleManager,
    diagnostics: MetadataDiagnostics,
  ) {
    this._store = store;
    this._index = index;
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
  }

  public register(descriptor: MetadataDescriptor): void {
    if (this._lifecycle.state !== MetadataState.REGISTERING) {
      throw new MetadataStateError(
        `MetadataRegistryManager: registration is only allowed in REGISTERING state (current: ${this._lifecycle.state}).`,
      );
    }

    const start = Date.now();

    const existing = this._index.getById(descriptor.id);
    if (existing) {
      this._diagnostics.recordDuplicateAttempt();
      throw new MetadataDuplicateError(
        `MetadataRegistryManager: Duplicate descriptor registered for id "${descriptor.id}".`,
      );
    }

    this._store.add(descriptor);
    this._index.index(descriptor);
    this._diagnostics.recordRegistration(descriptor.type, Date.now() - start);
  }
}
