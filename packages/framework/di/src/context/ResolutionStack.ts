import { TokenFormatter } from '../provider/ProviderDescriptor';
import { InjectionToken } from '../types/dependencyTypes';

export class ResolutionStack {
  private readonly _stack: { token: InjectionToken; key: string | symbol; name: string }[] = [];

  public push(token: InjectionToken): void {
    const key = TokenFormatter.toKey(token);
    const name = TokenFormatter.format(token);
    this._stack.push({ token, key, name });
  }

  public pop(): void {
    this._stack.pop();
  }

  public contains(token: InjectionToken): boolean {
    const key = TokenFormatter.toKey(token);
    return this._stack.some((entry) => entry.key === key);
  }

  public getCyclePath(token: InjectionToken): readonly string[] {
    const key = TokenFormatter.toKey(token);
    const targetName = TokenFormatter.format(token);

    const startIndex = this._stack.findIndex((entry) => entry.key === key);
    if (startIndex === -1) {
      return Object.freeze([...this.toArray(), targetName]);
    }

    const cycleSlice = this._stack.slice(startIndex).map((entry) => entry.name);
    cycleSlice.push(targetName);
    return Object.freeze(cycleSlice);
  }

  public toArray(): readonly string[] {
    return Object.freeze(this._stack.map((entry) => entry.name));
  }

  public get depth(): number {
    return this._stack.length;
  }
}
