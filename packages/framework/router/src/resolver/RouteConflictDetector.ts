import { RoutePattern } from '../matcher/RoutePattern';

export class RouteConflictDetector {
  public static checkConflict(a: RoutePattern, b: RoutePattern): boolean {
    if (a.segments.length !== b.segments.length) {
      return false;
    }
    for (let i = 0; i < a.segments.length; i++) {
      const segA = a.segments[i];
      const segB = b.segments[i];
      if (segA.type !== segB.type) {
        return false;
      }
      if (segA.type === 'STATIC' && segB.type === 'STATIC') {
        if (segA.value !== segB.value) {
          return false;
        }
      }
    }
    return true;
  }
}
