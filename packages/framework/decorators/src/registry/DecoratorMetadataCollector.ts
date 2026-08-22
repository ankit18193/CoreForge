import { DecoratorMetadata, MetadataType } from '@coreforge/contracts';

import { DecoratorIndex } from './DecoratorIndex';
import { DecoratorRegistration } from './DecoratorRegistration';
import { DecoratorStateError } from '../errors/DecoratorErrors';
import { DecoratorProfiler } from '../internal/DecoratorProfiler';
import { DecoratorLifecycleManager } from '../lifecycle/DecoratorLifecycleManager';
import { DecoratorState } from '../lifecycle/DecoratorState';

export class DecoratorMetadataCollector {
  private readonly _index = new DecoratorIndex();
  private readonly _lifecycle = new DecoratorLifecycleManager();
  private readonly _profiler = new DecoratorProfiler();

  constructor() {
    this._lifecycle.transitionTo(DecoratorState.REGISTERING);
  }

  public get state(): DecoratorState {
    return this._lifecycle.state;
  }

  public get index(): DecoratorIndex {
    return this._index;
  }

  public get profiler(): DecoratorProfiler {
    return this._profiler;
  }

  public register(metadata: DecoratorMetadata | DecoratorRegistration): void {
    if (this._lifecycle.state !== DecoratorState.REGISTERING) {
      throw new DecoratorStateError(
        `DecoratorMetadataCollector: registrations are only allowed in REGISTERING state (current: ${this._lifecycle.state}).`,
      );
    }

    const start = Date.now();

    const registration =
      metadata instanceof DecoratorRegistration
        ? metadata
        : new DecoratorRegistration({
            id: metadata.id,
            type: metadata.type,
            target: metadata.target,
            parentId: metadata.parentId,
            properties: metadata.properties as Record<string, unknown>,
          });

    this._index.index(registration);
    this._profiler.recordCollection(metadata.type, Date.now() - start);
  }

  public resolve(type: MetadataType): readonly DecoratorRegistration[] {
    return this._index.getByType(type);
  }

  public getAll(): readonly DecoratorRegistration[] {
    return this._index.getAll();
  }

  public getById(id: string): DecoratorRegistration | undefined {
    return this._index.getById(id);
  }

  public getByTarget(target: string): readonly DecoratorRegistration[] {
    return this._index.getByTarget(target);
  }

  public getByType(type: MetadataType): readonly DecoratorRegistration[] {
    return this._index.getByType(type);
  }

  public getByParentId(parentId: string): readonly DecoratorRegistration[] {
    return this._index.getByParentId(parentId);
  }

  public makeReady(): void {
    if (this._lifecycle.state === DecoratorState.READY) {
      return;
    }
    this._lifecycle.transitionTo(DecoratorState.READY);
  }

  public stop(): void {
    if (this._lifecycle.state === DecoratorState.STOPPED) {
      return;
    }
    this._lifecycle.transitionTo(DecoratorState.STOPPED);
  }

  public clear(): void {
    this._index.clear();
    this._profiler.reset();
    this._lifecycle.reset();
    this._lifecycle.transitionTo(DecoratorState.REGISTERING);
  }
}
