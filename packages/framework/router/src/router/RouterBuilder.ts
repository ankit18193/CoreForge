import { Router } from './Router';
import { RouterConfiguration } from './RouterConfiguration';
import { RouterOptions } from './RouterOptions';
import { RouterStateError } from '../errors/RouterErrors';

export class RouterBuilder {
  private readonly _options: RouterOptions = {};
  private _prefixConfigured = false;
  private _caseSensitiveConfigured = false;

  public configurePrefix(prefix: string): this {
    if (this._prefixConfigured) {
      throw new RouterStateError('Prefix configuration has already been specified.');
    }
    if (prefix !== '' && !prefix.startsWith('/')) {
      throw new RouterStateError(
        `Invalid prefix: "${prefix}". Router prefix must start with a slash "/".`,
      );
    }
    this._options.prefix = prefix;
    this._prefixConfigured = true;
    return this;
  }

  public configureCaseSensitive(caseSensitive: boolean): this {
    if (this._caseSensitiveConfigured) {
      throw new RouterStateError('Case sensitive options have already been configured.');
    }
    this._options.caseSensitive = caseSensitive;
    this._caseSensitiveConfigured = true;
    return this;
  }

  public build(): Router {
    const configuration = new RouterConfiguration(this._options);
    return new Router(configuration);
  }
}
