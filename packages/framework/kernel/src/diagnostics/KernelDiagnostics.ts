export interface KernelDiagnosticsSnapshot {
  readonly integrationDurationMs: number;
  readonly validationDurationMs: number;
  readonly initializationDurationMs: number;
  readonly registeredSubsystemCount: number;
  readonly integratedPackageCount: number;
  readonly lifecycleTransitionCount: number;
  readonly validationFailures: number;
  readonly startupTimestamp: number;
  readonly frameworkVersion: string;
}

export class KernelDiagnostics {
  private _integrationTimeMs = 0;
  private _validationTimeMs = 0;
  private _initializationTimeMs = 0;
  private _registeredCount = 0;
  private _integratedCount = 0;
  private _transitions = 0;
  private _failures = 0;
  private _startupTime = 0;
  private readonly _version = '1.0.0';

  public recordIntegration(duration: number, count: number): void {
    this._integrationTimeMs = duration;
    this._integratedCount = count;
  }

  public recordValidation(duration: number, success: boolean): void {
    this._validationTimeMs = duration;
    if (!success) {
      this._failures++;
    }
  }

  public recordInitialization(duration: number): void {
    this._initializationTimeMs = duration;
    this._startupTime = Date.now();
  }

  public recordTransition(): void {
    this._transitions++;
  }

  public recordRegistration(count: number): void {
    this._registeredCount = count;
  }

  public getSnapshot(): KernelDiagnosticsSnapshot {
    return {
      integrationDurationMs: this._integrationTimeMs,
      validationDurationMs: this._validationTimeMs,
      initializationDurationMs: this._initializationTimeMs,
      registeredSubsystemCount: this._registeredCount,
      integratedPackageCount: this._integratedCount,
      lifecycleTransitionCount: this._transitions,
      validationFailures: this._failures,
      startupTimestamp: this._startupTime,
      frameworkVersion: this._version,
    };
  }
}
