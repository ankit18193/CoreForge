export interface PluginDiagnosticsSnapshot {
  readonly registeredCount: number;
  readonly enabledCount: number;
  readonly disabledCount: number;
  readonly loadDurationMs: number;
  readonly dependencyGraphSize: number;
  readonly loadFailures: number;
  readonly enableFailures: number;

  readonly registrationDurationMs: number;
  readonly dependencyResolutionDurationMs: number;
  readonly initializationDurationMs: number;
  readonly shutdownDurationMs: number;
  readonly enabledTimestamp: number;
  readonly disabledTimestamp: number;
  readonly dependencyGraphDepth: number;
  readonly pluginLoadFailures: number;
  readonly initializationFailures: number;
  readonly shutdownFailures: number;
  readonly lifecycleTransitionCount: number;
}

export class PluginDiagnostics {
  private _registeredCount = 0;
  private _enabledCount = 0;
  private _disabledCount = 0;
  private _loadDurationMs = 0;
  private _dependencyGraphSize = 0;
  private _loadFailures = 0;
  private _enableFailures = 0;

  private _registrationDurationMs = 0;
  private _dependencyResolutionDurationMs = 0;
  private _initializationDurationMs = 0;
  private _shutdownDurationMs = 0;
  private _enabledTimestamp = 0;
  private _disabledTimestamp = 0;
  private _dependencyGraphDepth = 0;
  private _pluginLoadFailures = 0;
  private _initializationFailures = 0;
  private _shutdownFailures = 0;
  private _lifecycleTransitionCount = 0;

  public recordRegistration(duration: number, count: number): void {
    this._registrationDurationMs = duration;
    this._registeredCount = count;
  }

  public recordResolution(
    duration: number,
    size: number,
    depth: number,
  ): void {
    this._dependencyResolutionDurationMs = duration;
    this._dependencyGraphSize = size;
    this._dependencyGraphDepth = depth;
  }

  public recordLoad(duration: number, success: boolean): void {
    this._loadDurationMs = duration;
    if (!success) {
      this._loadFailures++;
      this._pluginLoadFailures++;
    }
  }

  public recordInitialization(duration: number, success: boolean): void {
    this._initializationDurationMs = duration;
    if (!success) {
      this._initializationFailures++;
    }
  }

  public recordShutdown(duration: number, success: boolean): void {
    this._shutdownDurationMs = duration;
    if (!success) {
      this._shutdownFailures++;
    }
  }

  public recordEnable(timestamp: number, success: boolean): void {
    this._enabledTimestamp = timestamp;
    if (success) {
      this._enabledCount++;
      this._disabledCount = Math.max(0, this._disabledCount - 1);
    } else {
      this._enableFailures++;
    }
  }

  public recordDisable(timestamp: number): void {
    this._disabledTimestamp = timestamp;
    this._disabledCount++;
    this._enabledCount = Math.max(0, this._enabledCount - 1);
  }

  public recordTransition(): void {
    this._lifecycleTransitionCount++;
  }

  public getSnapshot(): PluginDiagnosticsSnapshot {
    return {
      registeredCount: this._registeredCount,
      enabledCount: this._enabledCount,
      disabledCount: this._disabledCount,
      loadDurationMs: this._loadDurationMs,
      dependencyGraphSize: this._dependencyGraphSize,
      loadFailures: this._loadFailures,
      enableFailures: this._enableFailures,

      registrationDurationMs: this._registrationDurationMs,
      dependencyResolutionDurationMs: this._dependencyResolutionDurationMs,
      initializationDurationMs: this._initializationDurationMs,
      shutdownDurationMs: this._shutdownDurationMs,
      enabledTimestamp: this._enabledTimestamp,
      disabledTimestamp: this._disabledTimestamp,
      dependencyGraphDepth: this._dependencyGraphDepth,
      pluginLoadFailures: this._pluginLoadFailures,
      initializationFailures: this._initializationFailures,
      shutdownFailures: this._shutdownFailures,
      lifecycleTransitionCount: this._lifecycleTransitionCount,
    };
  }
}
