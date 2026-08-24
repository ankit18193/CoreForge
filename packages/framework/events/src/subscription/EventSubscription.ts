import { EventSubscription as IEventSubscription } from '@coreforge/contracts';

export class EventSubscription implements IEventSubscription {
  public readonly id: string;
  public readonly eventType: string;
  private readonly _onUnsubscribe: () => void;
  private _active = true;

  constructor(id: string, eventType: string, onUnsubscribe: () => void) {
    this.id = id;
    this.eventType = eventType;
    this._onUnsubscribe = onUnsubscribe;
  }

  public get active(): boolean {
    return this._active;
  }

  public unsubscribe(): void {
    if (!this._active) {
      return; // Idempotent
    }
    this._active = false;
    this._onUnsubscribe();
  }
}
