export interface TimestampProvider {
  getTimestamp(): number;
}

export class DefaultTimestampProvider implements TimestampProvider {
  public getTimestamp(): number {
    return Date.now();
  }
}
