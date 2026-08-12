import { CircularDependencyError } from '@coreforge/container';

export class ScopeResolutionContext {
  private readonly _stack: unknown[] = [];
  private _depth = 0;

  public push(token: unknown): void {
    if (this._stack.includes(token)) {
      const path = [...this._stack, token].map((t) => this.getTokenName(t)).join(' ➔ ');
      throw new CircularDependencyError(`Circular dependency detected: ${path}`);
    }
    this._stack.push(token);
    this._depth++;
  }

  public pop(): void {
    this._stack.pop();
    this._depth--;
  }

  public get currentToken(): unknown | undefined {
    return this._stack[this._stack.length - 1];
  }

  public get dependencyPath(): readonly string[] {
    return Object.freeze(this._stack.map((t) => this.getTokenName(t)));
  }

  public get resolutionDepth(): number {
    return this._depth;
  }

  private getTokenName(token: unknown): string {
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token === 'symbol') {
      return token.description || token.toString();
    }
    if (typeof token === 'function') {
      return token.name;
    }
    return String(token);
  }
}
