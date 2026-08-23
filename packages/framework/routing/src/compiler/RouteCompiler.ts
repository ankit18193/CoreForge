import { RoutePatternCompiler } from './RoutePatternCompiler';
import { RoutePrecedenceCalculator } from './RoutePrecedenceCalculator';
import { RouteCompilationError } from '../errors/RoutingErrors';
import { HttpMethodUtil } from '../method/HttpMethod';
import {
  InternalCompiledRoute,
  RouteCompilerOptions,
  RouteDefinition,
} from '../types/routingTypes';

export class RouteCompiler {
  private readonly _options: RouteCompilerOptions;

  constructor(options: RouteCompilerOptions = {}) {
    this._options = options;
  }

  public compile(definition: RouteDefinition): InternalCompiledRoute {
    if (!definition || typeof definition !== 'object') {
      throw new RouteCompilationError('Route definition must be a valid non-null object.');
    }

    if (!definition.id || typeof definition.id !== 'string' || !definition.id.trim()) {
      throw new RouteCompilationError('Route definition must have a non-empty string id.');
    }

    if (!definition.action || typeof definition.action !== 'object') {
      throw new RouteCompilationError(
        `Route definition '${definition.id}' must provide a valid ActionDescriptor.`,
      );
    }

    const method = HttpMethodUtil.normalize(definition.method);
    const normalizedPath = RoutePatternCompiler.normalizePath(definition.path, this._options);
    const segments = RoutePatternCompiler.compileSegments(definition.path, this._options);
    const precedenceVector = RoutePrecedenceCalculator.calculatePrecedenceVector(segments);
    const numericScore = RoutePrecedenceCalculator.calculateNumericScore(precedenceVector);
    const rawTrimmed = definition.path.trim();
    const endsWithSlash = rawTrimmed.length > 1 && rawTrimmed.endsWith('/');

    const compiled: InternalCompiledRoute = {
      id: definition.id.trim(),
      method,
      path: normalizedPath,
      segments,
      compiledSegments: segments,
      action: definition.action,
      precedence: numericScore,
      precedenceVector,
      endsWithSlash,
    };

    return Object.freeze(compiled);
  }

  public compileMany(definitions: readonly RouteDefinition[]): readonly InternalCompiledRoute[] {
    return Object.freeze(definitions.map((def) => this.compile(def)));
  }
}
