import { ParsedRoutePattern } from '../types/httpRoutingTypes';

export class HttpParameterExtractor {
  public static safeDecode(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  public static extract(
    pattern: ParsedRoutePattern,
    requestSegments: readonly string[],
  ): Readonly<Record<string, string>> {
    const params: Record<string, string> = {};

    for (let i = 0; i < pattern.segments.length; i++) {
      const seg = pattern.segments[i];
      if (seg.type === 'PARAM' && seg.paramName && i < requestSegments.length) {
        params[seg.paramName] = HttpParameterExtractor.safeDecode(requestSegments[i]);
      }
    }

    return Object.freeze(params);
  }
}
