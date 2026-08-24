import { DomainEvent } from '@coreforge/contracts';

export class ApplicationStoppedEvent implements DomainEvent<Record<string, unknown>> {
  public readonly id: string;
  public readonly type = 'ApplicationStoppedEvent';
  public readonly name = 'ApplicationStoppedEvent';
  public readonly timestamp: number;
  public readonly payload: Record<string, unknown>;

  constructor(id?: string, timestamp?: number, payload: Record<string, unknown> = {}) {
    this.id = id || `evt-${Date.now()}`;
    this.timestamp = timestamp || Date.now();
    this.payload = payload;
  }
}
