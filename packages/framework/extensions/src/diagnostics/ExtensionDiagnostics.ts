export interface ExtensionDiagnosticsSnapshot {
  readonly registeredCount: number;
  readonly enabledCount: number;
  readonly disabledCount: number;
  readonly loadDurationMs: number;
  readonly dependencyGraphSize: number;
  readonly loadFailures: number;
  readonly enableFailures: number;
  readonly dependencyResolutionDurationMs: number;
  readonly registrationDurationMs: number;
  readonly loadingDurationMs: number;
  readonly enabledTimestamp: number;
  readonly disabledTimestamp: number;
  readonly dependencyGraphDepth: number;
  readonly stateTransitionCount: number;
}

export class ExtensionDiagnostics {
  private _registeredCount = 0;
  private _enabledCount = 0;
  private _disabledCount = 0;
  private _loadDurationMs = 0;
  private _dependencyGraphSize = 0;
  private _loadFailures = 0;
  private _enableFailures = 0;

  private _dependencyResolutionDurationMs = 0;
  private _registrationDurationMs = 0;
  private _loadingDurationMs = 0;
  private _enabledTimestamp = 0;
  private _disabledTimestamp = 0;
  private _dependencyGraphDepth = 0;
  private _stateTransitionCount = 0;

  public recordRegistration(duration: number, count: number): void {
    this._registrationDurationMs = duration;
    this._registeredCount = count;
  }

  public recordResolution(duration: number, size: number, depth: number): void {
    this._dependencyResolutionDurationMs = duration;
    this._dependencyGraphSize = size;
    this._dependencyGraphDepth = depth;
  }

  public recordLoad(duration: number, success: boolean): void {
    this._loadDurationMs = duration;
    this._loadingDurationMs = duration;
    if (!success) {
      this._loadFailures++;
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
    this._stateTransitionCount++;
  }

  public getSnapshot(): ExtensionDiagnosticsSnapshot {
    return {
      registeredCount: this._registeredCount,
      enabledCount: this._enabledCount,
      disabledCount: this._disabledCount,
      loadDurationMs: this._loadDurationMs,
      dependencyGraphSize: this._dependencyGraphSize,
      loadFailures: this._loadFailures,
      enableFailures: this._enableFailures,
      dependencyResolutionDurationMs: this._dependencyResolutionDurationMs,
      registrationDurationMs: this._registrationDurationMs,
      loadingDurationMs: this._loadingDurationMs,
      enabledTimestamp: this._enabledTimestamp,
      disabledTimestamp: this._disabledTimestamp,
      dependencyGraphDepth: this._dependencyGraphDepth,
      stateTransitionCount: this._stateTransitionCount,
    };
  }
}
