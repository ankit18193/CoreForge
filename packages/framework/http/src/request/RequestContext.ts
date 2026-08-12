import { FrameworkRegistry, HttpRequest, HttpResponse } from '@coreforge/contracts';

export class RequestContext {
  public readonly request: HttpRequest;
  public readonly response?: HttpResponse | undefined;
  public readonly requestId: string;
  public readonly timestamp: number;
  public readonly registry: FrameworkRegistry;
  public readonly diagnostics: Record<string, unknown> = {};

  constructor(params: {
    request: HttpRequest;
    response?: HttpResponse | undefined;
    requestId: string;
    registry: FrameworkRegistry;
    timestamp?: number | undefined;
  }) {
    this.request = params.request;
    this.response = params.response;
    this.requestId = params.requestId;
    this.registry = params.registry;
    this.timestamp = params.timestamp !== undefined ? params.timestamp : Date.now();
  }

  public withResponse(response: HttpResponse): RequestContext {
    const context = new RequestContext({
      request: this.request,
      response,
      requestId: this.requestId,
      registry: this.registry,
      timestamp: this.timestamp,
    });
    Object.assign(context.diagnostics, this.diagnostics);
    return context;
  }
}
