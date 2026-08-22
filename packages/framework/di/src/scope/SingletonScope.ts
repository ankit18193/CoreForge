import { TokenFormatter } from '../provider/ProviderDescriptor';
import { InjectionToken } from '../types/dependencyTypes';

export interface ScopedInstanceEntry {
  readonly token: InjectionToken;
  readonly tokenName: string;
  readonly instance: unknown;
}

export class SingletonScope {
  private readonly _instances = new Map<
    string | symbol,
    { token: InjectionToken; tokenName: string; instance: unknown }
  >();

  public get<T>(token: InjectionToken): T | undefined {
    const key = TokenFormatter.toKey(token);
    const entry = this._instances.get(key);
    return entry ? (entry.instance as T) : undefined;
  }

  public set<T>(token: InjectionToken, instance: T): void {
    const key = TokenFormatter.toKey(token);
    const tokenName = TokenFormatter.format(token);
    this._instances.set(key, { token, tokenName, instance });
  }

  public has(token: InjectionToken): boolean {
    const key = TokenFormatter.toKey(token);
    return this._instances.has(key);
  }

  public getAllEntries(): readonly ScopedInstanceEntry[] {
    return Object.freeze(Array.from(this._instances.values()));
  }

  public clear(): void {
    this._instances.clear();
  }

  public get size(): number {
    return this._instances.size;
  }
}
