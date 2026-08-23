import { CompiledRouteSegment, RoutePrecedence } from '../types/routingTypes';

export class RoutePrecedenceCalculator {
  public static calculatePrecedenceVector(
    segments: readonly CompiledRouteSegment[],
  ): RoutePrecedence {
    let staticSegments = 0;
    let constrainedParams = 0;
    let dynamicParams = 0;
    let wildcards = 0;

    for (const seg of segments) {
      if (seg.kind === 'STATIC') {
        staticSegments++;
      } else if (seg.kind === 'PARAM') {
        if (seg.constraint) {
          constrainedParams++;
        } else {
          dynamicParams++;
        }
      } else if (seg.kind === 'WILDCARD') {
        wildcards++;
      }
    }

    return Object.freeze({
      staticSegments,
      constrainedParams,
      dynamicParams,
      wildcards,
      segmentCount: segments.length,
    });
  }

  public static calculateNumericScore(vector: RoutePrecedence): number {
    // Weighted representation for contracts
    return (
      vector.staticSegments * 1000 +
      vector.constrainedParams * 500 +
      vector.dynamicParams * 100 +
      vector.segmentCount * 10 -
      vector.wildcards * 50
    );
  }

  /**
   * Compares two RoutePrecedence vectors lexicographically.
   * Returns:
   *   < 0 if a has higher precedence than b (a should be tried before b)
   *   > 0 if b has higher precedence than a (b should be tried before a)
   *   0 if identical precedence
   */
  public static compare(a: RoutePrecedence, b: RoutePrecedence): number {
    // 1. Static segments count (higher wins)
    if (b.staticSegments !== a.staticSegments) {
      return b.staticSegments - a.staticSegments;
    }

    // 2. Constrained dynamic parameters count (higher wins)
    if (b.constrainedParams !== a.constrainedParams) {
      return b.constrainedParams - a.constrainedParams;
    }

    // 3. Dynamic parameters count (higher wins)
    if (b.dynamicParams !== a.dynamicParams) {
      return b.dynamicParams - a.dynamicParams;
    }

    // 4. Segment count / specificity (higher wins)
    if (b.segmentCount !== a.segmentCount) {
      return b.segmentCount - a.segmentCount;
    }

    // 5. Wildcards count (fewer wildcards wins)
    if (a.wildcards !== b.wildcards) {
      return a.wildcards - b.wildcards;
    }

    return 0;
  }
}
