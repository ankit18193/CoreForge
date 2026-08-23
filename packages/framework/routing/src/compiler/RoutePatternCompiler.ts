import {
  DuplicateRouteParameterError,
  InvalidRouteParameterError,
  InvalidRoutePatternError,
} from '../errors/RoutingErrors';
import { CompiledRouteSegment, RouteCompilerOptions } from '../types/routingTypes';

const PARAM_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export class RoutePatternCompiler {
  public static normalizePath(rawPath: string, options: RouteCompilerOptions = {}): string {
    if (!rawPath || typeof rawPath !== 'string') {
      return '/';
    }

    let p = rawPath.trim();
    if (!p.startsWith('/')) {
      p = '/' + p;
    }

    // Collapse consecutive slashes e.g. //users///id -> /users/id
    p = p.replace(/\/+/g, '/');

    const strict = options.strictTrailingSlash ?? false;
    if (!strict && p.length > 1 && p.endsWith('/')) {
      p = p.substring(0, p.length - 1);
    }

    return p;
  }

  public static compileSegments(
    pattern: string,
    options: RouteCompilerOptions = {},
  ): readonly CompiledRouteSegment[] {
    const normalized = RoutePatternCompiler.normalizePath(pattern, options);

    if (normalized === '/' || normalized === '') {
      return Object.freeze([]);
    }

    const rawSegments = normalized.split('/').filter(Boolean);
    const compiled: CompiledRouteSegment[] = [];
    const seenParamNames = new Set<string>();

    for (let i = 0; i < rawSegments.length; i++) {
      const seg = rawSegments[i];
      const isLast = i === rawSegments.length - 1;

      // 1. Wildcard segment: *path or *
      if (seg.startsWith('*')) {
        if (!isLast) {
          throw new InvalidRoutePatternError(
            pattern,
            `Wildcard segment '${seg}' must be the final segment in the route pattern.`,
          );
        }

        const wildcardName = seg.length > 1 ? seg.substring(1) : 'wildcard';
        if (!PARAM_NAME_REGEX.test(wildcardName)) {
          throw new InvalidRouteParameterError(
            wildcardName,
            `Wildcard parameter name '${wildcardName}' is invalid. Must be a valid JavaScript identifier.`,
          );
        }

        if (seenParamNames.has(wildcardName)) {
          throw new DuplicateRouteParameterError(wildcardName, pattern);
        }
        seenParamNames.add(wildcardName);

        compiled.push(
          Object.freeze({
            kind: 'WILDCARD',
            name: wildcardName,
          }),
        );
        continue;
      }

      // 2. Dynamic parameter segment: :id or :id(\d+)
      if (seg.startsWith(':')) {
        const paramContent = seg.substring(1);
        const parenIdx = paramContent.indexOf('(');

        let paramName = paramContent;
        let constraint: string | undefined;
        let compiledRegex: RegExp | undefined;

        if (parenIdx !== -1) {
          if (!paramContent.endsWith(')')) {
            throw new InvalidRoutePatternError(
              pattern,
              `Malformed constraint in parameter '${seg}'. Missing closing parenthesis.`,
            );
          }

          paramName = paramContent.substring(0, parenIdx);
          constraint = paramContent.substring(parenIdx + 1, paramContent.length - 1).trim();

          if (!constraint) {
            throw new InvalidRoutePatternError(
              pattern,
              `Constraint for parameter '${paramName}' cannot be empty.`,
            );
          }

          try {
            compiledRegex = new RegExp(`^(?:${constraint})$`);
          } catch (regexErr) {
            throw new InvalidRoutePatternError(
              pattern,
              `Invalid regex constraint '${constraint}' in parameter '${paramName}': ${regexErr instanceof Error ? regexErr.message : String(regexErr)}`,
            );
          }
        }

        if (!PARAM_NAME_REGEX.test(paramName)) {
          throw new InvalidRouteParameterError(
            paramName,
            `Parameter name '${paramName}' is invalid. Must be a valid JavaScript identifier.`,
          );
        }

        if (seenParamNames.has(paramName)) {
          throw new DuplicateRouteParameterError(paramName, pattern);
        }
        seenParamNames.add(paramName);

        compiled.push(
          Object.freeze({
            kind: 'PARAM',
            name: paramName,
            constraint,
            compiledRegex,
          }),
        );
        continue;
      }

      // 3. Static segment
      compiled.push(
        Object.freeze({
          kind: 'STATIC',
          value: seg,
        }),
      );
    }

    return Object.freeze(compiled);
  }
}
