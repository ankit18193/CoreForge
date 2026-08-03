import { Module } from '@coreforge/contracts';

import { ModuleStateTransitionError } from '../errors/ModuleErrors';
import { ModuleMetadata } from '../metadata/ModuleMetadata';

export enum ModuleState {
  CREATED = 'CREATED',
  REGISTERED = 'REGISTERED',
  CONFIGURED = 'CONFIGURED',
  INITIALIZED = 'INITIALIZED',
  STARTED = 'STARTED',
  READY = 'READY',
  STOPPING = 'STOPPING',
  SHUTDOWN = 'SHUTDOWN',
  DISPOSED = 'DISPOSED',
  FAILED = 'FAILED',
}

export class ModuleDescriptor {
  public readonly metadata: ModuleMetadata;
  public readonly instance: Module;
  private _state: ModuleState = ModuleState.CREATED;
  public readonly dependencies: ModuleDescriptor[] = [];

  constructor(metadata: ModuleMetadata, instance: Module) {
    this.metadata = this.deepFreeze(metadata);
    this.instance = instance;
  }

  public get state(): ModuleState {
    return this._state;
  }

  public transitionTo(target: ModuleState): void {
    if (target === ModuleState.FAILED) {
      this._state = target;
      return;
    }

    const current = this._state;
    let valid = false;

    switch (current) {
      case ModuleState.CREATED:
        valid = target === ModuleState.REGISTERED;
        break;
      case ModuleState.REGISTERED:
        valid = target === ModuleState.CONFIGURED;
        break;
      case ModuleState.CONFIGURED:
        valid = target === ModuleState.INITIALIZED;
        break;
      case ModuleState.INITIALIZED:
        valid = target === ModuleState.STARTED;
        break;
      case ModuleState.STARTED:
        valid = target === ModuleState.READY;
        break;
      case ModuleState.READY:
        valid = target === ModuleState.STOPPING;
        break;
      case ModuleState.STOPPING:
        valid = target === ModuleState.SHUTDOWN;
        break;
      case ModuleState.SHUTDOWN:
        valid = target === ModuleState.DISPOSED;
        break;
      case ModuleState.DISPOSED:
        valid = false;
        break;
      case ModuleState.FAILED:
        valid =
          target === ModuleState.STOPPING ||
          target === ModuleState.SHUTDOWN ||
          target === ModuleState.DISPOSED;
        break;
    }

    if (!valid) {
      throw new ModuleStateTransitionError(
        `Invalid module state transition from "${current}" to "${target}" for module "${this.metadata.name}".`,
        { module: this.metadata.name, from: current, to: target },
      );
    }

    this._state = target;
  }

  private deepFreeze<T>(obj: T): T {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const propVal = (obj as Record<string, unknown>)[prop];
        if (
          propVal !== null &&
          (typeof propVal === 'object' || typeof propVal === 'function') &&
          !Object.isFrozen(propVal)
        ) {
          this.deepFreeze(propVal);
        }
      });
    }
    return obj;
  }
}
