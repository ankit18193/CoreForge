import {
  HttpMethod,
  HttpRouteMatch,
  HttpRouteResolver as IHttpRouteResolver,
  HttpRequest,
} from '@coreforge/contracts';

import { HttpRouteRegistry, RegisteredRouteEntry } from './HttpRouteRegistry';
import { HttpRouteSnapshot } from './HttpRouteSnapshot';
import { ParsedRoutePattern, RouteSegment } from '../types/httpRoutingTypes';

function splitPathSegments(path: string): string[] {
  const normalized = HttpRouteSnapshot.normalizePath(path);
  if (normalized === '/') {
    return [];
  }
  return normalized.slice(1).split('/');
}

function parseRoutePattern(routePath: string): ParsedRoutePattern {
  const rawSegments = splitPathSegments(routePath);
  const segments: RouteSegment[] = rawSegments.map((seg) => {
    if (seg.startsWith(':') && seg.length > 1) {
      return {
        type: 'PARAM',
        value: seg,
        paramName: seg.slice(1),
      };
    }
    return {
      type: 'STATIC',
      value: seg,
    };
  });

  const staticSegmentCount = segments.filter((s) => s.type === 'STATIC').length;
  const paramSegmentCount = segments.filter((s) => s.type === 'PARAM').length;

  return {
    rawPath: routePath,
    normalizedPath: HttpRouteSnapshot.normalizePath(routePath),
    segments,
    staticSegmentCount,
    paramSegmentCount,
    isStaticOnly: paramSegmentCount === 0,
  };
}

interface MatchCandidate {
  readonly entry: RegisteredRouteEntry;
  readonly pattern: ParsedRoutePattern;
  readonly extractedParams: Record<string, string>;
}

export class HttpRouteResolver implements IHttpRouteResolver {
  private readonly _registry: HttpRouteRegistry;
  private readonly _patternCache = new Map<string, ParsedRoutePattern>();

  constructor(registry: HttpRouteRegistry) {
    this._registry = registry;
  }

  public get registry(): HttpRouteRegistry {
    return this._registry;
  }

  private _getParsedPattern(routePath: string): ParsedRoutePattern {
    let pattern = this._patternCache.get(routePath);
    if (!pattern) {
      pattern = parseRoutePattern(routePath);
      this._patternCache.set(routePath, pattern);
    }
    return pattern;
  }

  private _matchSegments(
    pattern: ParsedRoutePattern,
    requestSegments: string[],
  ): { matched: boolean; params: Record<string, string> } {
    if (pattern.segments.length !== requestSegments.length) {
      return { matched: false, params: {} };
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < pattern.segments.length; i++) {
      const routeSeg = pattern.segments[i];
      const reqSeg = requestSegments[i];

      if (routeSeg.type === 'STATIC') {
        if (routeSeg.value !== reqSeg) {
          return { matched: false, params: {} };
        }
      } else if (routeSeg.type === 'PARAM') {
        if (!reqSeg || reqSeg.trim().length === 0) {
          return { matched: false, params: {} };
        }
        let decodedParam: string;
        try {
          decodedParam = decodeURIComponent(reqSeg);
        } catch {
          decodedParam = reqSeg;
        }
        if (routeSeg.paramName) {
          params[routeSeg.paramName] = decodedParam;
        }
      }
    }

    return { matched: true, params };
  }

  private _compareCandidates(a: MatchCandidate, b: MatchCandidate): number {
    // 1. Static segment specificity DESC (more static segments = more specific)
    if (a.pattern.staticSegmentCount !== b.pattern.staticSegmentCount) {
      return b.pattern.staticSegmentCount - a.pattern.staticSegmentCount;
    }

    // 2. Parameter segment count ASC (fewer params = more specific)
    if (a.pattern.paramSegmentCount !== b.pattern.paramSegmentCount) {
      return a.pattern.paramSegmentCount - b.pattern.paramSegmentCount;
    }

    // 3. Route priority DESC
    const prioA = a.entry.route.priority ?? 0;
    const prioB = b.entry.route.priority ?? 0;
    if (prioA !== prioB) {
      return prioB - prioA;
    }

    // 4. Registration sequence ASC
    return a.entry.sequence - b.entry.sequence;
  }

  public resolve(method: HttpMethod, path: string): HttpRouteMatch | undefined {
    const uppercaseMethod = (method ? method.toUpperCase() : '') as HttpMethod;
    const entries = this._registry.getByMethod(uppercaseMethod);
    if (entries.length === 0) {
      return undefined;
    }

    const requestSegments = splitPathSegments(path);
    const candidates: MatchCandidate[] = [];

    for (const entry of entries) {
      const pattern = this._getParsedPattern(entry.route.path);
      const matchResult = this._matchSegments(pattern, requestSegments);

      if (matchResult.matched) {
        candidates.push({
          entry,
          pattern,
          extractedParams: matchResult.params,
        });
      }
    }

    if (candidates.length === 0) {
      return undefined;
    }

    // Sort candidates by deterministic precedence
    candidates.sort((a, b) => this._compareCandidates(a, b));

    const best = candidates[0];
    const match: HttpRouteMatch = {
      routeId: best.entry.route.id,
      method: best.entry.route.method,
      path: best.entry.route.path,
      operation: best.entry.route.operation,
      parameters: Object.freeze({ ...best.extractedParams }),
      metadata: best.entry.route.metadata,
    };

    return Object.freeze(match);
  }

  public match(request: HttpRequest): HttpRouteMatch | undefined {
    if (!request || !request.method || !request.url) {
      return undefined;
    }
    const path = request.path ?? new URL(request.url, 'http://localhost').pathname;
    return this.resolve(request.method.toUpperCase() as HttpMethod, path);
  }

  public findAllowedMethodsForPath(path: string): readonly HttpMethod[] {
    const requestSegments = splitPathSegments(path);
    const allowed = new Set<HttpMethod>();

    for (const entry of this._registry.listEntries()) {
      const pattern = this._getParsedPattern(entry.route.path);
      const matchResult = this._matchSegments(pattern, requestSegments);
      if (matchResult.matched) {
        allowed.add(entry.route.method);
      }
    }

    return Object.freeze(Array.from(allowed));
  }
}
