import { ConfigurationStateError } from '../errors/ConfigurationErrors';
import { ConfigurationSnapshot, EnvironmentName } from '../types/configurationTypes';

export class ConfigurationRegistry {
  private _snapshot?: ConfigurationSnapshot | undefined;
  private _version = 0;
  private _isLocked = false;

  public get isLocked(): boolean {
    return this._isLocked;
  }

  public get version(): number {
    return this._version;
  }

  public register(
    environment: EnvironmentName,
    values: Record<string, unknown>,
  ): ConfigurationSnapshot {
    if (this._isLocked) {
      throw new ConfigurationStateError(
        'Cannot modify ConfigurationRegistry after configuration is locked.',
      );
    }

    this._version++;
    const deepFrozen = this._deepFreeze(JSON.parse(JSON.stringify(values)));

    this._snapshot = Object.freeze({
      environment,
      version: this._version,
      loadedAt: Date.now(),
      values: deepFrozen,
    });

    return this._snapshot;
  }

  public lock(): void {
    this._isLocked = true;
  }

  public unlockForReload(): void {
    this._isLocked = false;
  }

  public getSnapshot(): ConfigurationSnapshot {
    if (!this._snapshot) {
      throw new ConfigurationStateError('Configuration has not been loaded yet.');
    }
    return this._snapshot;
  }

  private _deepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
      const val = (obj as Record<string, unknown>)[name];
      if (val && typeof val === 'object') {
        this._deepFreeze(val);
      }
    }

    return Object.freeze(obj);
  }
}
