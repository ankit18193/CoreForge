import { MetricsDiagnosticsSnapshot } from '@coreforge/contracts';

export class MetricsDiagnostics {
  private _totalRegistrations = 0;
  private _registrationFailures = 0;
  private _totalCounterUpdates = 0;
  private _totalGaugeUpdates = 0;
  private _totalHistogramObservations = 0;
  private _totalTimerObservations = 0;
  private _cardinalityRejections = 0;
  private _providerFailures = 0;
  private _totalOperationDurationMs = 0;
  private _totalOperations = 0;
  private _slowestOperationLatencyMs = 0;

  public recordRegistration(success: boolean): void {
    if (success) {
      this._totalRegistrations++;
    } else {
      this._registrationFailures++;
    }
  }

  public recordCounterUpdate(durationMs = 0): void {
    this._totalCounterUpdates++;
    this._recordLatency(durationMs);
  }

  public recordGaugeUpdate(durationMs = 0): void {
    this._totalGaugeUpdates++;
    this._recordLatency(durationMs);
  }

  public recordHistogramObservation(durationMs = 0): void {
    this._totalHistogramObservations++;
    this._recordLatency(durationMs);
  }

  public recordTimerObservation(durationMs = 0): void {
    this._totalTimerObservations++;
    this._recordLatency(durationMs);
  }

  public recordCardinalityRejection(): void {
    this._cardinalityRejections++;
  }

  public recordProviderFailure(): void {
    this._providerFailures++;
  }

  private _recordLatency(durationMs: number): void {
    if (durationMs > 0) {
      this._totalOperations++;
      this._totalOperationDurationMs += durationMs;
      if (durationMs > this._slowestOperationLatencyMs) {
        this._slowestOperationLatencyMs = durationMs;
      }
    }
  }

  public getSnapshot(): MetricsDiagnosticsSnapshot {
    const averageOperationLatencyMs =
      this._totalOperations > 0
        ? Math.round((this._totalOperationDurationMs / this._totalOperations) * 100) / 100
        : 0;

    return Object.freeze({
      totalRegistrations: this._totalRegistrations,
      registrationFailures: this._registrationFailures,
      totalCounterUpdates: this._totalCounterUpdates,
      totalGaugeUpdates: this._totalGaugeUpdates,
      totalHistogramObservations: this._totalHistogramObservations,
      totalTimerObservations: this._totalTimerObservations,
      cardinalityRejections: this._cardinalityRejections,
      providerFailures: this._providerFailures,
      averageOperationLatencyMs,
      slowestOperationLatencyMs: Math.round(this._slowestOperationLatencyMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalRegistrations = 0;
    this._registrationFailures = 0;
    this._totalCounterUpdates = 0;
    this._totalGaugeUpdates = 0;
    this._totalHistogramObservations = 0;
    this._totalTimerObservations = 0;
    this._cardinalityRejections = 0;
    this._providerFailures = 0;
    this._totalOperationDurationMs = 0;
    this._totalOperations = 0;
    this._slowestOperationLatencyMs = 0;
  }
}
