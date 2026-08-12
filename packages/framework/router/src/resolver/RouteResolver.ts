import { RouteMethod } from '@coreforge/contracts';

import { ResolutionContext } from './ResolutionContext';
import { RouteMatch } from './RouteMatch';
import { RouteNormalizer } from '../internal/RouteNormalizer';
import { ParameterExtractor } from '../matcher/ParameterExtractor';
import { RoutePattern } from '../matcher/RoutePattern';
import { RouteRegistry } from '../registry/RouteRegistry';

export class RouteResolver {
  private readonly _registry: RouteRegistry;

  constructor(registry: RouteRegistry) {
    this._registry = registry;
  }

  public resolve(
    method: RouteMethod,
    path: string,
    context?: ResolutionContext,
  ): RouteMatch | undefined {
    const normalized = RouteNormalizer.normalize(path, false);
    const requestSegments = RouteNormalizer.splitSegments(normalized);
    const descriptors = this._registry.get(method);

    for (const desc of descriptors) {
      if (this.matchSegments(desc.pattern, requestSegments)) {
        const params = ParameterExtractor.extract(desc.pattern, requestSegments);
        const match = new RouteMatch({ method: desc.method, path: desc.originalPath }, params);
        if (context) {
          context.complete(desc, params);
        }
        return match;
      }
    }

    if (context) {
      context.complete(undefined, undefined);
    }
    return undefined;
  }

  private matchSegments(pattern: RoutePattern, requestSegments: string[]): boolean {
    const segments = pattern.segments;
    const hasWildcard = segments.some((s) => s.type === 'WILDCARD');
    if (!hasWildcard && segments.length !== requestSegments.length) {
      return false;
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === 'STATIC') {
        if (seg.value !== requestSegments[i].toLowerCase()) {
          return false;
        }
      } else if (seg.type === 'PARAMETER') {
        if (requestSegments[i] === undefined || requestSegments[i] === '') {
          return false;
        }
      } else if (seg.type === 'WILDCARD') {
        return true;
      }
    }

    return true;
  }
}
