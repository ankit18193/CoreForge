import { EventBus } from './EventBus';
import { EventDispatchMode } from '../types/eventTypes';

export class EventBusBuilder {
  private _defaultDispatchMode: EventDispatchMode = 'SEQUENTIAL';
  private _autoStart = true;
  private _enableDiagnostics = true;

  public setDefaultDispatchMode(mode: EventDispatchMode): this {
    this._defaultDispatchMode = mode;
    return this;
  }

  public setAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public setEnableDiagnostics(enable: boolean): this {
    this._enableDiagnostics = enable;
    return this;
  }

  public build(): EventBus {
    return new EventBus({
      defaultDispatchMode: this._defaultDispatchMode,
      autoStart: this._autoStart,
      enableDiagnostics: this._enableDiagnostics,
    });
  }
}
