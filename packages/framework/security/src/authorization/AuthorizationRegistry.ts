import { SecurityAuthorizationPolicy } from './AuthorizationPolicy';

export class AuthorizationRegistry {
  private readonly _policies = new Map<string, SecurityAuthorizationPolicy>();

  public register(policy: SecurityAuthorizationPolicy): void {
    this._policies.set(policy.name, policy);
  }

  public get(name: string): SecurityAuthorizationPolicy | undefined {
    return this._policies.get(name);
  }

  public getPolicies(): readonly SecurityAuthorizationPolicy[] {
    return Array.from(this._policies.values());
  }

  public getPolicyCount(): number {
    return this._policies.size;
  }

  public clear(): void {
    this._policies.clear();
  }
}
