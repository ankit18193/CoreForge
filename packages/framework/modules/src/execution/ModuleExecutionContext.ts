import { LifecyclePhase } from '../lifecycle/ModuleLifecycleManager';

export class ModuleExecutionContext {
  public readonly startTimestamp: number;
  private _endTimestamp = 0;

  public currentLifecyclePhase?: LifecyclePhase | undefined;
  public readonly startupOrder: string[] = [];
  public readonly shutdownOrder: string[] = [];
  public failedModule?: string | undefined;
  public capturedException?: Error | undefined;

  public totalModules = 0;
  public readonly successfulModules: string[] = [];
  public readonly failedModules: string[] = [];

  constructor() {
    this.startTimestamp = Date.now();
  }

  public get endTimestamp(): number {
    return this._endTimestamp;
  }

  public get duration(): number {
    if (this._endTimestamp === 0) {
      return Date.now() - this.startTimestamp;
    }
    return this._endTimestamp - this.startTimestamp;
  }

  public complete(): void {
    this._endTimestamp = Date.now();
  }
}
