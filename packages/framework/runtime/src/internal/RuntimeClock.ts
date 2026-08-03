import { getTimestamp } from '@coreforge/utils';

export class RuntimeClock {
  private _startedAt = 0;

  public start(): void {
    this._startedAt = getTimestamp();
  }

  public get startedAt(): number {
    return this._startedAt;
  }

  public get uptime(): number {
    if (this._startedAt === 0) {
      return 0;
    }
    return Math.floor((getTimestamp() - this._startedAt) / 1000);
  }

  public reset(): void {
    this._startedAt = 0;
  }
}
