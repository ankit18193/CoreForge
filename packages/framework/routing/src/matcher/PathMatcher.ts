import { ParameterExtractor } from './ParameterExtractor';
import { CompiledRouteSegment } from '../types/routingTypes';

export class PathMatcher {
  public static matchesPath(
    routeSegments: readonly CompiledRouteSegment[],
    requestSegments: readonly string[],
    rawPath: string,
  ): Readonly<Record<string, string>> | null {
    const hasWildcard =
      routeSegments.length > 0 && routeSegments[routeSegments.length - 1].kind === 'WILDCARD';

    // Length check
    if (!hasWildcard && requestSegments.length !== routeSegments.length) {
      return null;
    }

    if (hasWildcard && requestSegments.length < routeSegments.length) {
      return null;
    }

    // Segment-by-segment match
    for (let i = 0; i < routeSegments.length; i++) {
      const routeSeg = routeSegments[i];

      if (routeSeg.kind === 'STATIC') {
        if (requestSegments[i] !== routeSeg.value) {
          return null;
        }
        continue;
      }

      if (routeSeg.kind === 'PARAM') {
        const rawValue = requestSegments[i];
        if (rawValue === undefined) {
          return null;
        }

        // Test constraint regex if present
        if (routeSeg.compiledRegex) {
          const decoded = ParameterExtractor.safeDecode(rawValue, rawPath);
          if (!routeSeg.compiledRegex.test(decoded)) {
            return null;
          }
        }
        continue;
      }

      if (routeSeg.kind === 'WILDCARD') {
        // Wildcard must match at least 1 remaining request segment
        const remaining = requestSegments.slice(i);
        if (remaining.length === 0) {
          return null;
        }
        break;
      }
    }

    // If structure matches, extract decoded parameters
    return ParameterExtractor.extractParameters(routeSegments, requestSegments, rawPath);
  }
}
