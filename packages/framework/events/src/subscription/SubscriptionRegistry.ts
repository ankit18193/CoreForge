import { EventSubscription } from './EventSubscription';

export class SubscriptionRegistry {
  private readonly _subscriptions = new Map<string, EventSubscription>();

  public register(subscription: EventSubscription): void {
    this._subscriptions.set(subscription.id, subscription);
  }

  public unregister(id: string): boolean {
    return this._subscriptions.delete(id);
  }

  public get(id: string): EventSubscription | undefined {
    return this._subscriptions.get(id);
  }

  public has(id: string): boolean {
    return this._subscriptions.has(id);
  }

  public get count(): number {
    return this._subscriptions.size;
  }

  public clear(): void {
    for (const sub of this._subscriptions.values()) {
      sub.unsubscribe();
    }
    this._subscriptions.clear();
  }
}
