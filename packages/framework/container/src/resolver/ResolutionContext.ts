import { CircularDependencyError } from '../errors/ContainerErrors';

export class ResolutionContext {
  private _dependencyStack: unknown[] = [];
  private _visitedTokens: Set<unknown> = new Set();

  public push(token: unknown): void {
    if (this._dependencyStack.includes(token)) {
      const chain = [...this._dependencyStack, token].map((t) => this.getTokenName(t)).join(' -> ');
      throw new CircularDependencyError(`Circular dependency detected: ${chain}`, {
        token,
        chain,
      });
    }
    this._dependencyStack.push(token);
    this._visitedTokens.add(token);
  }

  public pop(): void {
    this._dependencyStack.pop();
  }

  public get visited(): Set<unknown> {
    return this._visitedTokens;
  }

  private getTokenName(token: unknown): string {
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token === 'symbol') {
      return token.description || token.toString();
    }
    if (token && typeof token === 'object' && 'description' in token) {
      return (token as { description: string }).description;
    }
    if (typeof token === 'function') {
      return token.name;
    }
    return String(token);
  }
}
