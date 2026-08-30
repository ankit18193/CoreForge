import {
  HttpMethod,
  HttpRouteMatch,
  HttpRouteResolver as IHttpRouteResolver,
  HttpRequest,
} from '@coreforge/contracts';

import { HttpPathMatcher } from './HttpPathMatcher';
import { HttpRoutePattern } from './HttpRoutePattern';
import { HttpRouteRegistry, RegisteredRouteEntry } from './HttpRouteRegistry';
import { ParsedRoutePattern } from '../types/httpRoutingTypes';

interface MatchCandidate {
  readonly entry: RegisteredRouteEntry;
  readonly pattern: ParsedRoutePattern;
  readonly extractedParams: Readonly<Record<string, string>>;
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
      pattern = HttpRoutePattern.parse(routePath);
      this._patternCache.set(routePath, pattern);
    }
    return pattern;
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

    const candidates: MatchCandidate[] = [];

    for (const entry of entries) {
      const pattern = this._getParsedPattern(entry.route.path);
      const matchResult = HttpPathMatcher.match(pattern, path);

      if (matchResult.matched) {
        candidates.push({
          entry,
          pattern,
          extractedParams: matchResult.parameters,
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
      parameters: best.extractedParams,
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
    const allowed = new Set<HttpMethod>();

    for (const entry of this._registry.listEntries()) {
      const pattern = this._getParsedPattern(entry.route.path);
      const matchResult = HttpPathMatcher.match(pattern, path);
      if (matchResult.matched) {
        allowed.add(entry.route.method);
      }
    }

    return Object.freeze(Array.from(allowed));
  }
}
