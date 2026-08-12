import { HttpRequest, HttpResponse, RouteDefinition } from '@coreforge/contracts';

import { RequestCancellation } from './RequestCancellation';
import { RequestServices } from '../types/requestHandlerTypes';

export class RequestExecutionContext {
  public readonly request: HttpRequest;
  public readonly response: HttpResponse;
  public route?: RouteDefinition | undefined;
  public parameters: Readonly<Record<string, string>> = Object.freeze({});

  public controllerDescriptor?: unknown | undefined;
  public actionDescriptor?: unknown | undefined;

  public readonly services: RequestServices;
  public readonly requestId: string;
  public readonly startTime: number;
  public readonly cancellation: RequestCancellation;
  public readonly diagnostics: Record<string, unknown> = {};

  constructor(params: {
    request: HttpRequest;
    response: HttpResponse;
    services: RequestServices;
    requestId: string;
    cancellation: RequestCancellation;
  }) {
    this.request = params.request;
    this.response = params.response;
    this.services = params.services;
    this.requestId = params.requestId;
    this.startTime = Date.now();
    this.cancellation = params.cancellation;
  }
}
