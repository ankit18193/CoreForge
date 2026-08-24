import { DomainEvent } from '@coreforge/contracts';

export class ApplicationStartedEvent implements DomainEvent<Record<string, unknown>> {
  public readonly id: string;
  public readonly type = 'ApplicationStartedEvent';
  public readonly name = 'ApplicationStartedEvent';
  public readonly timestamp: number;
  public readonly payload: Record<string, unknown>;

  constructor(id?: string, timestamp?: number, payload: Record<string, unknown> = {}) {
    this.id = id || `evt-${Date.now()}`;
    this.timestamp = timestamp || Date.now();
    this.payload = payload;
  }
}
