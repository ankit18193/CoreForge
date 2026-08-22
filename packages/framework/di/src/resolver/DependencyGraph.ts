import { TokenFormatter } from '../provider/ProviderDescriptor';
import { InjectionToken } from '../types/dependencyTypes';

export class DependencyGraph {
  private readonly _nodes = new Map<string | symbol, readonly InjectionToken[]>();

  public addNode(token: InjectionToken, dependencies: readonly InjectionToken[] = []): void {
    const key = TokenFormatter.toKey(token);
    this._nodes.set(key, Object.freeze([...dependencies]));
  }

  public getDependencies(token: InjectionToken): readonly InjectionToken[] {
    const key = TokenFormatter.toKey(token);
    return this._nodes.get(key) || [];
  }

  public hasNode(token: InjectionToken): boolean {
    const key = TokenFormatter.toKey(token);
    return this._nodes.has(key);
  }

  public get size(): number {
    return this._nodes.size;
  }
}
