import { InjectionToken } from '../types/dependencyTypes';

export class TransientScope {
  public get<T>(_token: InjectionToken): T | undefined {
    return undefined;
  }

  public set<T>(_token: InjectionToken, _instance: T): void {
    // No-op: transient instances are never cached
  }

  public has(_token: InjectionToken): boolean {
    return false;
  }
}
