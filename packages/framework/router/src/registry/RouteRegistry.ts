import { RouteMethod } from '@coreforge/contracts';

import { RouteDescriptor } from './RouteDescriptor';
import { DuplicateRouteError, RouteConflictError } from '../errors/RouterErrors';
import { RouteNormalizer } from '../internal/RouteNormalizer';
import { RoutePattern, RouteSegment } from '../matcher/RoutePattern';
import { RouteConflictDetector } from '../resolver/RouteConflictDetector';

export class RouteRegistry {
  private readonly _descriptors = new Map<string, RouteDescriptor[]>();

  public static compilePattern(
    originalPath: string,
    caseSensitive = false,
  ): { pattern: RoutePattern; parameterNames: string[] } {
    const normalized = RouteNormalizer.normalize(originalPath, caseSensitive);
    const segments = RouteNormalizer.splitSegments(normalized);
    const compiledSegments: RouteSegment[] = [];
    const parameterNames: string[] = [];

    for (const seg of segments) {
      if (seg.startsWith(':')) {
        const paramName = seg.slice(1);
        compiledSegments.push({ type: 'PARAMETER', name: paramName });
        parameterNames.push(paramName);
      } else if (seg === '*') {
        compiledSegments.push({ type: 'WILDCARD' });
      } else {
        const value = caseSensitive ? seg : seg.toLowerCase();
        compiledSegments.push({ type: 'STATIC', value });
      }
    }

    return {
      pattern: new RoutePattern(compiledSegments),
      parameterNames: Object.freeze(parameterNames) as unknown as string[],
    };
  }

  public register(descriptor: RouteDescriptor): void {
    const list = this._descriptors.get(descriptor.method) || [];

    for (const existing of list) {
      if (this.isDuplicate(existing.pattern, descriptor.pattern)) {
        throw new DuplicateRouteError(
          `Route mapping already exists for ${descriptor.method} ${descriptor.originalPath}`,
        );
      }

      if (RouteConflictDetector.checkConflict(existing.pattern, descriptor.pattern)) {
        throw new RouteConflictError(
          `Structural conflict detected between new path "${descriptor.originalPath}" and existing path "${existing.originalPath}"`,
        );
      }
    }

    list.push(descriptor);
    list.sort((a, b) => this.comparePrecedence(a.pattern.segments, b.pattern.segments));
    this._descriptors.set(descriptor.method, list);
  }

  public get(method: RouteMethod): readonly RouteDescriptor[] {
    return Object.freeze(this._descriptors.get(method) || []);
  }

  public getAll(): readonly RouteDescriptor[] {
    const all: RouteDescriptor[] = [];
    for (const list of this._descriptors.values()) {
      all.push(...list);
    }
    return Object.freeze(all);
  }

  private isDuplicate(a: RoutePattern, b: RoutePattern): boolean {
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
      if (segA.type === 'PARAMETER' && segB.type === 'PARAMETER') {
        if (segA.name !== segB.name) {
          return false;
        }
      }
    }
    return true;
  }

  private comparePrecedence(a: readonly RouteSegment[], b: readonly RouteSegment[]): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const segA = a[i];
      const segB = b[i];

      const scoreA = segA.type === 'STATIC' ? 2 : segA.type === 'PARAMETER' ? 1 : 0;
      const scoreB = segB.type === 'STATIC' ? 2 : segB.type === 'PARAMETER' ? 1 : 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    }

    const hasWildA = a.some((s) => s.type === 'WILDCARD');
    const hasWildB = b.some((s) => s.type === 'WILDCARD');

    if (hasWildA && !hasWildB) {
      return 1;
    }
    if (!hasWildA && hasWildB) {
      return -1;
    }

    return b.length - a.length;
  }
}
