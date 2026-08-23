import {
  ActionDescriptor,
  CompiledRoute,
  HttpMethod,
  NormalizedRequest,
  RouteSegment,
} from '@coreforge/contracts';

export type { ActionDescriptor, CompiledRoute, HttpMethod, NormalizedRequest, RouteSegment };

export interface RouteDefinition {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly action: ActionDescriptor;
}

export interface RouteMatch {
  readonly route: CompiledRoute;
  readonly params: Readonly<Record<string, string>>;
  readonly parameters: Readonly<Record<string, string>>;
}

export interface RoutePrecedence {
  readonly staticSegments: number;
  readonly constrainedParams: number;
  readonly dynamicParams: number;
  readonly wildcards: number;
  readonly segmentCount: number;
}

export type CompiledRouteSegment =
  | {
      readonly kind: 'STATIC';
      readonly value: string;
    }
  | {
      readonly kind: 'PARAM';
      readonly name: string;
      readonly constraint?: string | undefined;
      readonly compiledRegex?: RegExp | undefined;
    }
  | {
      readonly kind: 'WILDCARD';
      readonly name: string;
    };

export interface InternalCompiledRoute extends CompiledRoute {
  readonly compiledSegments: readonly CompiledRouteSegment[];
  readonly precedenceVector: RoutePrecedence;
  readonly endsWithSlash: boolean;
}

export interface RouteCompilerOptions {
  readonly strictTrailingSlash?: boolean | undefined;
}

export interface RouteMatcherOptions {
  readonly enableDiagnostics?: boolean | undefined;
  readonly strictTrailingSlash?: boolean | undefined;
}

export interface RoutingDiagnosticsSnapshot {
  readonly totalMatches: number;
  readonly successfulMatches: number;
  readonly notFound: number;
  readonly methodNotAllowed: number;
  readonly malformedPaths: number;
  readonly routeConflicts: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly methodDistribution: Readonly<Record<string, number>>;
  readonly routeIdDistribution: Readonly<Record<string, number>>;
  readonly timestamp: number;
}
