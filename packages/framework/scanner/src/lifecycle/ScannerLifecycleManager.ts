import { ScannerState } from './ScannerState';
import { ScannerStateError } from '../errors/ScannerErrors';

export class ScannerLifecycleManager {
  private _state = ScannerState.CREATED;

  public get state(): ScannerState {
    return this._state;
  }

  public transitionTo(target: ScannerState): void {
    const allowed: Record<ScannerState, ScannerState[]> = {
      [ScannerState.CREATED]: [ScannerState.SCANNING, ScannerState.FAILED],
      [ScannerState.SCANNING]: [ScannerState.VALIDATING, ScannerState.FAILED],
      [ScannerState.VALIDATING]: [ScannerState.REGISTERING, ScannerState.FAILED],
      [ScannerState.REGISTERING]: [ScannerState.READY, ScannerState.FAILED],
      [ScannerState.READY]: [ScannerState.STOPPED, ScannerState.FAILED],
      [ScannerState.STOPPED]: [ScannerState.SCANNING, ScannerState.FAILED],
      [ScannerState.FAILED]: [],
    };

    const next = allowed[this._state];
    if (!next.includes(target)) {
      throw new ScannerStateError(
        `ScannerLifecycleManager: invalid transition from ${this._state} to ${target}.`,
      );
    }
    this._state = target;
  }
}
