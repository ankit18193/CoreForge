export class SerializationProfiler {
  private readonly _start = Date.now();
  private _mapperTime = 0;
  private _negotiationTime = 0;
  private _serializationTime = 0;

  public recordMapper(duration: number): void {
    this._mapperTime = duration;
  }

  public recordNegotiation(duration: number): void {
    this._negotiationTime = duration;
  }

  public recordSerialization(duration: number): void {
    this._serializationTime = duration;
  }

  public get totalTime(): number {
    return Date.now() - this._start;
  }

  public get timings() {
    return {
      mapperTime: this._mapperTime,
      negotiationTime: this._negotiationTime,
      serializationTime: this._serializationTime,
      totalTime: this.totalTime,
    };
  }
}
