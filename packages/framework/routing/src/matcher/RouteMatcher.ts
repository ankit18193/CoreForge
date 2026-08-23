import { RouteMatcher as IRouteMatcher } from '@coreforge/contracts';

import { PathMatcher } from './PathMatcher';
import { RoutePatternCompiler } from '../compiler/RoutePatternCompiler';
import { RoutingDiagnostics } from '../diagnostics/RoutingDiagnostics';
import {
  MethodNotAllowedError,
  RouteNotFoundError,
  RoutingConfigurationError,
} from '../errors/RoutingErrors';
import { RoutingProfiler } from '../internal/RoutingProfiler';
import { RoutingLifecycleManager } from '../lifecycle/RoutingLifecycleManager';
import { HttpMethodUtil } from '../method/HttpMethod';
import { RouteRegistry } from '../registry/RouteRegistry';
import {
  HttpMethod,
  InternalCompiledRoute,
  NormalizedRequest,
  RouteMatch,
  RouteMatcherOptions,
  RoutingDiagnosticsSnapshot,
} from '../types/routingTypes';

export class RouteMatcher implements IRouteMatcher {
  private readonly _registry: RouteRegistry;
  private readonly _lifecycle: RoutingLifecycleManager;
  private readonly _diagnostics: RoutingDiagnostics;
  private readonly _enableDiagnostics: boolean;
  private readonly _options: RouteMatcherOptions;

  constructor(
    registry: RouteRegistry,
    lifecycle: RoutingLifecycleManager = new RoutingLifecycleManager(),
    options: RouteMatcherOptions = {},
  ) {
    this._registry = registry;
    this._lifecycle = lifecycle;
    this._diagnostics = new RoutingDiagnostics();
    this._enableDiagnostics = options.enableDiagnostics ?? true;
    this._options = options;

    if (this._lifecycle.state === 'CREATED') {
      this._lifecycle.makeReady();
    }
  }

  public get lifecycle(): RoutingLifecycleManager {
    return this._lifecycle;
  }

  public get diagnostics(): RoutingDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public match(request: NormalizedRequest): RouteMatch {
    this._lifecycle.ensureCanMatch();
    const profiler = new RoutingProfiler();

    if (!request || typeof request !== 'object') {
      throw new RoutingConfigurationError('Cannot match invalid request object.');
    }

    const rawPath = typeof request.path === 'string' ? request.path : '/';
    const method = HttpMethodUtil.normalize(request.method || 'GET');

    // 1. Clean path and split into segments
    let cleanPath = rawPath.trim();
    const qIdx = cleanPath.indexOf('?');
    if (qIdx !== -1) {
      cleanPath = cleanPath.substring(0, qIdx);
    }
    const hashIdx = cleanPath.indexOf('#');
    if (hashIdx !== -1) {
      cleanPath = cleanPath.substring(0, hashIdx);
    }

    const strict = this._options.strictTrailingSlash ?? false;
    const rawTrimmed = rawPath.trim();
    const reqEndsWithSlash = rawTrimmed.length > 1 && rawTrimmed.endsWith('/');

    cleanPath = RoutePatternCompiler.normalizePath(cleanPath, this._options);
    const reqSegments =
      cleanPath === '/' || cleanPath === '' ? [] : cleanPath.split('/').filter(Boolean);

    // 2. Scan all routes in precedence order
    const allRoutes = this._registry.list();
    const pathMatches: {
      route: InternalCompiledRoute;
      params: Readonly<Record<string, string>>;
    }[] = [];

    for (const route of allRoutes) {
      if (strict && route.endsWithSlash !== reqEndsWithSlash) {
        continue;
      }

      const params = PathMatcher.matchesPath(route.compiledSegments, reqSegments, rawPath);
      if (params !== null) {
        pathMatches.push({ route, params });
      }
    }

    // 3. Match Method with HEAD fallback logic
    let selectedMatch: {
      route: InternalCompiledRoute;
      params: Readonly<Record<string, string>>;
    } | null = null;

    if (method === 'HEAD') {
      // Prefer explicit HEAD route first
      selectedMatch = pathMatches.find((m) => m.route.method === 'HEAD') || null;
      // Fallback to GET route
      if (!selectedMatch) {
        selectedMatch = pathMatches.find((m) => m.route.method === 'GET') || null;
      }
    } else {
      selectedMatch = pathMatches.find((m) => m.route.method === method) || null;
    }

    const durationMs = profiler.stop();

    // 4. If matched, return RouteMatch
    if (selectedMatch) {
      if (this._enableDiagnostics) {
        this._diagnostics.recordSuccess(selectedMatch.route.id, method, durationMs);
      }

      return Object.freeze({
        route: selectedMatch.route,
        params: selectedMatch.params,
        parameters: selectedMatch.params,
      });
    }

    // 5. If path matched other methods, throw MethodNotAllowedError
    if (pathMatches.length > 0) {
      if (this._enableDiagnostics) {
        this._diagnostics.recordMethodNotAllowed(durationMs);
      }

      const allowedMethods = Array.from(
        new Set(pathMatches.map((m) => m.route.method)),
      ) as HttpMethod[];

      throw new MethodNotAllowedError(rawPath, method, allowedMethods);
    }

    // 6. Path did not match any route, throw RouteNotFoundError
    if (this._enableDiagnostics) {
      this._diagnostics.recordNotFound(durationMs);
    }

    throw new RouteNotFoundError(rawPath, method);
  }
}
