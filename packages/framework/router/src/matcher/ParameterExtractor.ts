import { RoutePattern } from './RoutePattern';

export class ParameterExtractor {
  public static extract(pattern: RoutePattern, requestSegments: string[]): Record<string, string> {
    const params: Record<string, string> = {};
    const segments = pattern.segments;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === 'PARAMETER') {
        params[seg.name] = requestSegments[i];
      } else if (seg.type === 'WILDCARD') {
        params['*'] = requestSegments.slice(i).join('/');
        break;
      }
    }

    return params;
  }
}
