import { DomainEvent } from '@coreforge/contracts';

export class ApplicationFailedEvent implements DomainEvent<{ error: Error }> {
  public readonly id: string;
  public readonly type = 'ApplicationFailedEvent';
  public readonly name = 'ApplicationFailedEvent';
  public readonly timestamp: number;
  public readonly error: Error;
  public readonly payload: { error: Error };

  constructor(error: Error, id?: string, timestamp?: number) {
    this.id = id || `evt-${Date.now()}`;
    this.timestamp = timestamp || Date.now();
    this.error = error;
    this.payload = { error };
  }
}
