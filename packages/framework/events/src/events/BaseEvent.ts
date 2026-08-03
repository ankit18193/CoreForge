import { getTimestamp } from '@coreforge/utils';

export abstract class BaseEvent<T = unknown> {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;
  public readonly payload: T;

  constructor(name: string, payload: T) {
    this.id = this.generateId();
    this.name = name;
    this.timestamp = getTimestamp();
    this.payload = payload;

    this.deepFreeze(this);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + getTimestamp().toString(36);
  }

  private deepFreeze(obj: unknown): void {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const propVal = (obj as Record<string, unknown>)[prop];
        if (
          propVal !== null &&
          (typeof propVal === 'object' || typeof propVal === 'function') &&
          !Object.isFrozen(propVal)
        ) {
          this.deepFreeze(propVal);
        }
      });
    }
  }
}
