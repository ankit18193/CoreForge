export class ExecutionId {
  private static _counter = 0;

  public static generate(): string {
    this._counter++;
    return `exec-${Date.now()}-${this._counter}`;
  }
}
