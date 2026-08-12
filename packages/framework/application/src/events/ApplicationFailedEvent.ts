export class ApplicationFailedEvent {
  public readonly name = 'ApplicationFailedEvent';
  public readonly timestamp = Date.now();
  public readonly error: Error;

  constructor(error: Error) {
    this.error = error;
  }
}
