export class ScopeProfiler {
  private readonly _creationTime = Date.now();
  private _disposalDuration = 0;
  private _resolutionDuration = 0;

  public recordResolution(duration: number): void {
    this._resolutionDuration += duration;
  }

  public recordDisposal(duration: number): void {
    this._disposalDuration = duration;
  }

  public get creationTime(): number {
    return this._creationTime;
  }

  public get resolutionDuration(): number {
    return this._resolutionDuration;
  }

  public get disposalDuration(): number {
    return this._disposalDuration;
  }

  public get totalLifetime(): number {
    return Date.now() - this._creationTime;
  }
}
