export class SecurityProfiler {
  private _authTime = 0;
  private _authZTime = 0;
  private _totalTime = 0;

  public recordAuthentication(duration: number): void {
    this._authTime = duration;
  }

  public recordAuthorization(duration: number): void {
    this._authZTime = duration;
  }

  public recordTotal(duration: number): void {
    this._totalTime = duration;
  }

  public get timings() {
    return {
      authenticationTime: this._authTime,
      authorizationTime: this._authZTime,
      totalTime: this._totalTime,
    };
  }
}
