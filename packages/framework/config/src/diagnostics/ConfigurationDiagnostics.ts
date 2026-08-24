import {
  ConfigurationDiagnosticsSnapshot,
  ConfigurationState,
  EnvironmentName,
} from '../types/configurationTypes';

export class ConfigurationDiagnostics {
  private _loadCount = 0;
  private _validationCount = 0;
  private _validationFailures = 0;
  private _loadDurationMs = 0;
  private _lastLoadedAt?: number | undefined;
  private _sourceCount = 0;
  private _keyCount = 0;

  public recordLoadStart(sourceCount: number): void {
    this._sourceCount = sourceCount;
  }

  public recordLoadSuccess(durationMs: number, keyCount: number): void {
    this._loadCount++;
    this._loadDurationMs = durationMs;
    this._lastLoadedAt = Date.now();
    this._keyCount = keyCount;
  }

  public recordValidation(success: boolean): void {
    this._validationCount++;
    if (!success) {
      this._validationFailures++;
    }
  }

  public getSnapshot(
    state: ConfigurationState,
    environment: EnvironmentName,
    configurationVersion: number,
  ): ConfigurationDiagnosticsSnapshot {
    return Object.freeze({
      loadCount: this._loadCount,
      validationCount: this._validationCount,
      validationFailures: this._validationFailures,
      loadDurationMs: this._loadDurationMs,
      lastLoadedAt: this._lastLoadedAt,
      environment,
      configurationVersion,
      state,
      sourceCount: this._sourceCount,
      keyCount: this._keyCount,
      timestamp: Date.now(),
    });
  }

  public reset(): void {
    this._loadCount = 0;
    this._validationCount = 0;
    this._validationFailures = 0;
    this._loadDurationMs = 0;
    this._lastLoadedAt = undefined;
    this._sourceCount = 0;
    this._keyCount = 0;
  }
}
