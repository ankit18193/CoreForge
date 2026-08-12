import { HttpRequest, HttpResponse, RequestHandler as IRequestHandler } from '@coreforge/contracts';

import { RequestHandlerConfiguration } from './RequestHandlerConfiguration';
import { RequestCoordinator } from '../coordinator/RequestCoordinator';
import { RequestDiagnostics, RequestDiagnosticsSnapshot } from '../diagnostics/RequestDiagnostics';
import { RequestExecutionError } from '../errors/RequestHandlerErrors';
import { RequestProfiler } from '../internal/RequestProfiler';
import { RequestHandlerLifecycle, RequestHandlerState } from '../lifecycle/RequestHandlerLifecycle';
import { RequestServices } from '../types/requestHandlerTypes';

export class RequestHandler implements IRequestHandler {
  private readonly _config: RequestHandlerConfiguration;
  private readonly _lifecycle = new RequestHandlerLifecycle();
  private readonly _profiler = new RequestProfiler();
  private readonly _diagnostics: RequestDiagnostics;
  private readonly _coordinator: RequestCoordinator;

  private readonly _services: RequestServices;
  private _counter = 0;

  constructor(config: RequestHandlerConfiguration, services: RequestServices) {
    this._config = config;
    this._services = services;
    this._diagnostics = new RequestDiagnostics(this._profiler);
    this._coordinator = new RequestCoordinator(config, this._profiler);
    this._lifecycle.transitionTo(RequestHandlerState.READY);
  }

  public get state(): RequestHandlerState {
    return this._lifecycle.state;
  }

  public get diagnostics(): RequestDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public get configuration(): RequestHandlerConfiguration {
    return this._config;
  }

  public async handle(request: HttpRequest, response: HttpResponse): Promise<void> {
    if (
      this._lifecycle.state === RequestHandlerState.STOPPED ||
      this._lifecycle.state === RequestHandlerState.STOPPING
    ) {
      throw new RequestExecutionError('Cannot handle request when RequestHandler is stopped.');
    }

    if (this._lifecycle.state === RequestHandlerState.READY) {
      this._lifecycle.transitionTo(RequestHandlerState.RUNNING);
    }

    const requestId = `req-${++this._counter}`;
    try {
      await this._coordinator.execute(request, response, this._services, requestId);
    } finally {
      if (this._lifecycle.state === RequestHandlerState.RUNNING) {
        this._lifecycle.transitionTo(RequestHandlerState.READY);
      }
    }
  }

  public stop(): void {
    if (
      this._lifecycle.state === RequestHandlerState.READY ||
      this._lifecycle.state === RequestHandlerState.RUNNING
    ) {
      this._lifecycle.transitionTo(RequestHandlerState.STOPPING);
      this._lifecycle.transitionTo(RequestHandlerState.STOPPED);
    }
  }
}
