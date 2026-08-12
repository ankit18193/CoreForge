import { SecurityAuthenticationProvider } from './AuthenticationProvider';

export class AuthenticationRegistry {
  private readonly _providers: SecurityAuthenticationProvider[] = [];

  public register(provider: SecurityAuthenticationProvider): void {
    this._providers.push(provider);
  }

  public getProviders(): readonly SecurityAuthenticationProvider[] {
    return this._providers;
  }

  public getProviderCount(): number {
    return this._providers.length;
  }

  public clear(): void {
    this._providers.length = 0;
  }
}
