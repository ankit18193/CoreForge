import {
  HttpMethod,
  HttpRoute,
  HttpRouteMatch,
  HttpRouteOptions,
  HttpRouteRegistry,
  HttpRouteResolver,
  HttpRoutingDiagnosticsSnapshot,
  HttpRoutingOptions,
  HttpRoutingResult,
  HttpRequest,
} from '@coreforge/contracts';

export type {
  HttpMethod,
  HttpRoute,
  HttpRouteMatch,
  HttpRouteOptions,
  HttpRouteRegistry,
  HttpRouteResolver,
  HttpRoutingDiagnosticsSnapshot,
  HttpRoutingOptions,
  HttpRoutingResult,
  HttpRequest,
};

export type RouteSegmentType = 'STATIC' | 'PARAM';

export interface RouteSegment {
  readonly type: RouteSegmentType;
  readonly value: string;
  readonly paramName?: string | undefined;
}

export interface ParsedRoutePattern {
  readonly rawPath: string;
  readonly normalizedPath: string;
  readonly segments: readonly RouteSegment[];
  readonly staticSegmentCount: number;
  readonly paramSegmentCount: number;
  readonly isStaticOnly: boolean;
}
