import { RequestContextManager, ScopeFactory } from './RequestContextManager';
import { RequestContextManagerOptions } from './RequestContextManagerOptions';

export class RequestContextManagerBuilder {
  private _scopeFactory?: ScopeFactory | undefined;
  private _options: RequestContextManagerOptions = {};

  public setScopeFactory(scopeFactory: ScopeFactory): this {
    this._scopeFactory = scopeFactory;
    return this;
  }

  public setDefaultTimeoutMs(defaultTimeoutMs: number): this {
    this._options = { ...this._options, defaultTimeoutMs };
    return this;
  }

  public setEnableDiagnostics(enableDiagnostics: boolean): this {
    this._options = { ...this._options, enableDiagnostics };
    return this;
  }

  public setOptions(options: RequestContextManagerOptions): this {
    this._options = { ...this._options, ...options };
    return this;
  }

  public build(): RequestContextManager {
    if (!this._scopeFactory) {
      throw new Error('RequestContextManagerBuilder: ScopeFactory (or Container) is required.');
    }
    return new RequestContextManager(this._scopeFactory, this._options);
  }
}
