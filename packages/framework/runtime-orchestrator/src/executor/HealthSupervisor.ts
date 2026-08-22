import { HealthMonitor } from './HealthMonitor';
import { RuntimeExecutionLifecycleManager } from '../lifecycle/RuntimeExecutionLifecycleManager';
import { RuntimeExecutionState } from '../lifecycle/RuntimeExecutionState';

export class HealthSupervisor {
  private readonly _monitor: HealthMonitor;
  private readonly _lifecycle: RuntimeExecutionLifecycleManager;
  private _failedComponentsCount = 0;

  constructor(monitor: HealthMonitor, lifecycle: RuntimeExecutionLifecycleManager) {
    this._monitor = monitor;
    this._lifecycle = lifecycle;
  }

  public get failedComponentsCount(): number {
    return this._failedComponentsCount;
  }

  public supervise(): void {
    const checks = this._monitor.runHealthCheck();
    let hasFailure = false;
    for (const res of checks) {
      if (res.status === 'DOWN') {
        hasFailure = true;
        this._failedComponentsCount++;
      }
    }

    if (hasFailure && this._lifecycle.state === RuntimeExecutionState.RUNNING) {
      this._lifecycle.transitionTo(RuntimeExecutionState.FAILED);
    }
  }
}
