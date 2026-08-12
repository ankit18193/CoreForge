export class RequestIdGenerator {
  private _counter = 0;

  public generate(): string {
    this._counter++;
    return `req-${Date.now()}-${this._counter}`;
  }
}
