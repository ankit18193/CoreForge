import { RoutePattern } from './RoutePattern';

export class PathMatcher {
  public static match(pattern: RoutePattern, requestSegments: string[]): boolean {
    const segments = pattern.segments;

    const hasWildcard = segments.some((s) => s.type === 'WILDCARD');
    if (!hasWildcard && segments.length !== requestSegments.length) {
      return false;
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === 'STATIC') {
        if (seg.value !== requestSegments[i]) {
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
