import type {
  ExecutionContext,
  HttpController,
  HttpControllerContext,
  HttpControllerDiagnosticsSnapshot,
  HttpControllerRegistry as IHttpControllerRegistry,
  HttpControllerResult,
  HttpControllerResultState,
  HttpEndpoint,
  HttpEndpointOptions,
  HttpEndpointRegistry as IHttpEndpointRegistry,
  HttpMethod,
  HttpMiddlewareRouteInfo,
  HttpRequest,
  TransportContext,
} from '@coreforge/contracts';

export type {
  ExecutionContext,
  HttpController,
  HttpControllerContext,
  HttpControllerDiagnosticsSnapshot,
  IHttpControllerRegistry,
  HttpControllerResult,
  HttpControllerResultState,
  HttpEndpoint,
  HttpEndpointOptions,
  IHttpEndpointRegistry,
  HttpMethod,
  HttpMiddlewareRouteInfo,
  HttpRequest,
  TransportContext,
};

export interface RegisteredControllerEntry {
  readonly controller: HttpController;
  readonly priority: number;
  readonly sequence: number;
}

export interface RegisteredEndpointEntry {
  readonly endpoint: HttpEndpoint;
  readonly priority: number;
  readonly enabled: boolean;
  readonly sequence: number;
}
