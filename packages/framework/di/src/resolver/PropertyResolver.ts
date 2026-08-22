import { TokenResolveFunction } from './ConstructorResolver';
import { ResolutionContext } from '../context/ResolutionContext';
import { PropertyInjection } from '../types/dependencyTypes';

export class PropertyResolver {
  private readonly _resolveToken: TokenResolveFunction;

  constructor(resolveToken: TokenResolveFunction) {
    this._resolveToken = resolveToken;
  }

  public async injectProperties(
    instance: unknown,
    propertyInjections: readonly PropertyInjection[] = [],
    context: ResolutionContext,
  ): Promise<void> {
    if (!instance || typeof instance !== 'object' || propertyInjections.length === 0) {
      return;
    }

    for (const prop of propertyInjections) {
      const resolvedDep = await this._resolveToken(prop.token, context);
      (instance as Record<string | symbol, unknown>)[prop.propertyKey] = resolvedDep;
    }
  }
}
