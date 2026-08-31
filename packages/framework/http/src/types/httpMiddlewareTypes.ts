import type {
  ExecutionContext,
  HttpMethod,
  HttpMiddleware,
  HttpMiddlewareBatchResult,
  HttpMiddlewareContext,
  HttpMiddlewareDiagnosticsSnapshot,
  HttpMiddlewareFailureStrategy,
  HttpMiddlewareNext,
  HttpMiddlewareOptions,
  HttpMiddlewareRegistry as IHttpMiddlewareRegistry,
  HttpMiddlewareResolver as IHttpMiddlewareResolver,
  HttpMiddlewareResult,
  HttpMiddlewareResultState,
  HttpMiddlewareRouteInfo,
  HttpMiddlewareState,
  HttpRequest,
  HttpResponse,
  TransportContext,
} from '@coreforge/contracts';

export type {
  ExecutionContext,
  HttpMethod,
  HttpMiddleware,
  HttpMiddlewareBatchResult,
  HttpMiddlewareContext,
  HttpMiddlewareDiagnosticsSnapshot,
  HttpMiddlewareFailureStrategy,
  HttpMiddlewareNext,
  HttpMiddlewareOptions,
  IHttpMiddlewareRegistry,
  IHttpMiddlewareResolver,
  HttpMiddlewareResult,
  HttpMiddlewareResultState,
  HttpMiddlewareRouteInfo,
  HttpMiddlewareState,
  HttpRequest,
  HttpResponse,
  TransportContext,
};

export interface RegisteredMiddlewareEntry<TContext = HttpMiddlewareContext, TResult = unknown> {
  readonly middleware: HttpMiddleware<TContext, TResult>;
  readonly priority: number;
  readonly enabled: boolean;
  readonly failureStrategy: HttpMiddlewareFailureStrategy;
  readonly timeoutMs?: number | undefined;
  readonly sequence: number;
}

export interface HttpMiddlewarePipelineOptions {
  readonly defaultTimeoutMs?: number | undefined;
  readonly defaultFailureStrategy?: HttpMiddlewareFailureStrategy | undefined;
}
