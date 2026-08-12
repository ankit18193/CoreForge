import { ControllerConfiguration } from './ControllerConfiguration';
import { ControllerOptions } from './ControllerOptions';
import { ControllerStateError } from '../errors/ControllerErrors';

export class ControllerBuilder {
  private readonly _options: ControllerOptions = {};
  private _defaultVersionConfigured = false;

  public configureDefaultVersion(version: string): this {
    if (this._defaultVersionConfigured) {
      throw new ControllerStateError('Default version has already been configured.');
    }
    if (version === '') {
      throw new ControllerStateError('Default version cannot be empty.');
    }
    const opts = this._options as { defaultVersion?: string };
    opts.defaultVersion = version;
    this._defaultVersionConfigured = true;
    return this;
  }

  public build(): ControllerConfiguration {
    return new ControllerConfiguration(this._options);
  }
}
