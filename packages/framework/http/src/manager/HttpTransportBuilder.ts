import { TransportManager } from '@coreforge/contracts';
import { ApplicationIntegration } from '@coreforge/integration';

import { HttpTransportManager } from './HttpTransportManager';
import { HttpErrorMappingOptions } from '../types/httpTypes';

export class HttpTransportBuilder {
  private readonly _application?: ApplicationIntegration | undefined;
  private readonly _transportManager?: TransportManager | undefined;
  private readonly _defaultTimeoutMs?: number | undefined;
  private readonly _errorMappingOptions?: HttpErrorMappingOptions | undefined;
  private readonly _autoStart?: boolean | undefined;

  private constructor(
    application?: ApplicationIntegration,
    transportManager?: TransportManager,
    defaultTimeoutMs?: number,
    errorMappingOptions?: HttpErrorMappingOptions,
    autoStart?: boolean,
  ) {
    this._application = application;
    this._transportManager = transportManager;
    this._defaultTimeoutMs = defaultTimeoutMs;
    this._errorMappingOptions = errorMappingOptions;
    this._autoStart = autoStart;
  }

  public static create(): HttpTransportBuilder {
    return new HttpTransportBuilder();
  }

  public withApplication(application: ApplicationIntegration): HttpTransportBuilder {
    return new HttpTransportBuilder(
      application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
    );
  }

  public withTransportManager(transportManager: TransportManager): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
    );
  }

  public withDefaultTimeout(timeoutMs: number): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      timeoutMs,
      this._errorMappingOptions,
      this._autoStart,
    );
  }

  public withErrorMapping(errorMappingOptions: HttpErrorMappingOptions): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      errorMappingOptions,
      this._autoStart,
    );
  }

  public withAutoStart(autoStart = true): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      autoStart,
    );
  }

  public build(): HttpTransportManager {
    return new HttpTransportManager({
      application: this._application,
      transportManager: this._transportManager,
      defaultTimeoutMs: this._defaultTimeoutMs,
      errorMappingOptions: this._errorMappingOptions,
      autoStart: this._autoStart,
    });
  }
}
