import { HttpParameterExtractor } from './HttpParameterExtractor';
import { HttpRoutePattern } from './HttpRoutePattern';
import { HttpRouteSnapshot } from './HttpRouteSnapshot';
import { ParsedRoutePattern } from '../types/httpRoutingTypes';

export interface PathMatchResult {
  readonly matched: boolean;
  readonly parameters: Readonly<Record<string, string>>;
}

export interface PathMatcherOptions {
  readonly caseSensitive?: boolean | undefined;
}

export class HttpPathMatcher {
  public static splitSegments(path: string): string[] {
    return HttpRoutePattern.splitSegments(path);
  }

  public static normalizePath(path: string): string {
    return HttpRouteSnapshot.normalizePath(path);
  }

  public static match(
    pattern: ParsedRoutePattern,
    requestPath: string,
    options: PathMatcherOptions = {},
  ): PathMatchResult {
    const requestSegments = HttpPathMatcher.splitSegments(requestPath);

    if (pattern.segments.length !== requestSegments.length) {
      return Object.freeze({ matched: false, parameters: Object.freeze({}) });
    }

    const caseSensitive = options.caseSensitive ?? true;

    for (let i = 0; i < pattern.segments.length; i++) {
      const routeSeg = pattern.segments[i];
      const reqSeg = requestSegments[i];

      if (routeSeg.type === 'STATIC') {
        const routeVal = caseSensitive ? routeSeg.value : routeSeg.value.toLowerCase();
        const reqVal = caseSensitive ? reqSeg : reqSeg.toLowerCase();

        if (routeVal !== reqVal) {
          return Object.freeze({ matched: false, parameters: Object.freeze({}) });
        }
      } else if (routeSeg.type === 'PARAM') {
        if (!reqSeg || reqSeg.trim().length === 0) {
          return Object.freeze({ matched: false, parameters: Object.freeze({}) });
        }
      }
    }

    const parameters = HttpParameterExtractor.extract(pattern, requestSegments);
    return Object.freeze({
      matched: true,
      parameters,
    });
  }
}
