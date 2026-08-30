import {
  ExecutionContext,
  HttpHeaders,
  HttpMethod,
  HttpPathParameters,
  HttpQuery,
  HttpRequest,
  HttpRequestOptions,
  HttpResponse,
  HttpResponseOptions,
  TransportManager,
} from '@coreforge/contracts';
import { ApplicationIntegration } from '@coreforge/integration';

export type {
  HttpHeaders,
  HttpMethod,
  HttpPathParameters,
  HttpQuery,
  HttpRequest,
  HttpRequestOptions,
  HttpResponse,
  HttpResponseOptions,
};

export interface HttpErrorMappingOptions {
  readonly cancellationStatus?: number | undefined;
  readonly includeErrorDetails?: boolean | undefined;
  readonly customStatusMap?: Record<string, number> | undefined;
}

export interface HttpExecutionOptions extends HttpRequestOptions {
  readonly timeoutMs?: number | undefined;
  readonly context?: ExecutionContext | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface HttpTransportOptions {
  readonly application?: ApplicationIntegration | undefined;
  readonly transportManager?: TransportManager | undefined;
  readonly defaultTimeoutMs?: number | undefined;
  readonly errorMappingOptions?: HttpErrorMappingOptions | undefined;
  readonly autoStart?: boolean | undefined;
  readonly router?: unknown | undefined;
}

export interface HttpAdapterConfig {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly priority?: number | undefined;
  readonly defaultOptions?: HttpRequestOptions | undefined;
}

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
