import { HttpRouteSnapshot } from './HttpRouteSnapshot';
import { HttpParameterError, HttpRouteValidationError } from '../errors/HttpRoutingErrors';
import { ParsedRoutePattern, RouteSegment } from '../types/httpRoutingTypes';

const PARAM_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export class HttpRoutePattern {
  public static splitSegments(path: string): string[] {
    const normalized = HttpRouteSnapshot.normalizePath(path);
    if (normalized === '/') {
      return [];
    }
    return normalized.slice(1).split('/');
  }

  public static parse(routePath: string): ParsedRoutePattern {
    if (typeof routePath !== 'string' || routePath.trim().length === 0) {
      throw new HttpRouteValidationError('Route path must be a non-empty string');
    }

    const normalizedPath = HttpRouteSnapshot.normalizePath(routePath);
    const rawSegments = HttpRoutePattern.splitSegments(normalizedPath);
    const seenParamNames = new Set<string>();

    const segments: RouteSegment[] = rawSegments.map((seg) => {
      if (seg.startsWith(':')) {
        if (seg.length <= 1) {
          throw new HttpRouteValidationError(
            `Invalid parameter segment '${seg}' in route '${routePath}'. Parameter name cannot be empty.`,
          );
        }

        const paramName = seg.slice(1);
        if (!PARAM_NAME_REGEX.test(paramName)) {
          throw new HttpRouteValidationError(
            `Invalid parameter name '${paramName}' in route '${routePath}'. Parameter names must be valid identifiers.`,
          );
        }

        if (seenParamNames.has(paramName)) {
          throw new HttpParameterError(
            `Duplicate parameter name '${paramName}' detected in route '${routePath}'.`,
            paramName,
          );
        }

        seenParamNames.add(paramName);

        return Object.freeze({
          type: 'PARAM' as const,
          value: seg,
          paramName,
        });
      }

      return Object.freeze({
        type: 'STATIC' as const,
        value: seg,
      });
    });

    const staticSegmentCount = segments.filter((s) => s.type === 'STATIC').length;
    const paramSegmentCount = segments.filter((s) => s.type === 'PARAM').length;

    const pattern: ParsedRoutePattern = {
      rawPath: routePath,
      normalizedPath,
      segments: Object.freeze(segments),
      staticSegmentCount,
      paramSegmentCount,
      isStaticOnly: paramSegmentCount === 0,
    };

    return Object.freeze(pattern);
  }
}
