import { getTimestamp } from '@coreforge/utils';

export class EventExecutionContext {
  public readonly eventId: string;
  public readonly eventName: string;
  public readonly publishTimestamp: number;
  public readonly executionStart: number;
  private _executionEnd = 0;
  private _handlerCount = 0;

  constructor(eventId: string, eventName: string, publishTimestamp: number) {
    this.eventId = eventId;
    this.eventName = eventName;
    this.publishTimestamp = publishTimestamp;
    this.executionStart = getTimestamp();
  }

  public get executionEnd(): number {
    return this._executionEnd;
  }

  public get handlerCount(): number {
    return this._handlerCount;
  }

  public get duration(): number {
    if (this._executionEnd === 0) {
      return 0;
    }
    return this._executionEnd - this.executionStart;
  }

  public incrementHandlerCount(): void {
    this._handlerCount++;
  }

  public complete(): void {
    this._executionEnd = getTimestamp();
  }
}
