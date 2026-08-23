import { MalformedPathError } from '../errors/RoutingErrors';
import { CompiledRouteSegment } from '../types/routingTypes';

export class ParameterExtractor {
  public static safeDecode(value: string, fullPath: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      throw new MalformedPathError(
        fullPath,
        `Failed to decode percent-encoded value '${value}'. Invalid URI sequence.`,
      );
    }
  }

  public static extractParameters(
    routeSegments: readonly CompiledRouteSegment[],
    requestSegments: readonly string[],
    rawPath: string,
  ): Readonly<Record<string, string>> | null {
    const params: Record<string, string> = {};

    let reqIdx = 0;
    for (let rIdx = 0; rIdx < routeSegments.length; rIdx++) {
      const seg = routeSegments[rIdx];

      if (seg.kind === 'STATIC') {
        reqIdx++;
        continue;
      }

      if (seg.kind === 'PARAM') {
        const rawValue = requestSegments[reqIdx];
        if (rawValue === undefined) {
          return null;
        }

        const decodedValue = ParameterExtractor.safeDecode(rawValue, rawPath);

        // Check constraint regex if present
        if (seg.compiledRegex && !seg.compiledRegex.test(decodedValue)) {
          return null;
        }

        params[seg.name] = decodedValue;
        reqIdx++;
        continue;
      }

      if (seg.kind === 'WILDCARD') {
        // Wildcard consumes all remaining request segments
        const remaining = requestSegments.slice(reqIdx);
        if (remaining.length === 0) {
          // Wildcard requires at least one segment by default
          return null;
        }

        const decodedRemaining = remaining.map((part) =>
          ParameterExtractor.safeDecode(part, rawPath),
        );
        params[seg.name] = decodedRemaining.join('/');
        reqIdx = requestSegments.length;
        break;
      }
    }

    return Object.freeze(params);
  }
}
