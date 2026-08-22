import { ResolutionContext } from '../context/ResolutionContext';
import { InjectionToken } from '../types/dependencyTypes';

export type TokenResolveFunction = <T>(
  token: InjectionToken<T>,
  context: ResolutionContext,
) => Promise<T>;

export class ConstructorResolver {
  private readonly _resolveToken: TokenResolveFunction;

  constructor(resolveToken: TokenResolveFunction) {
    this._resolveToken = resolveToken;
  }

  public async resolveDependencies(
    dependencies: readonly InjectionToken[] = [],
    context: ResolutionContext,
  ): Promise<readonly unknown[]> {
    const resolvedArgs: unknown[] = [];
    for (const depToken of dependencies) {
      const resolved = await this._resolveToken(depToken, context);
      resolvedArgs.push(resolved);
    }
    return Object.freeze(resolvedArgs);
  }
}
