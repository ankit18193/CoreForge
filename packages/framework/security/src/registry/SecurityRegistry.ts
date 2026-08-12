import { AuthenticationRegistry } from '../authentication/AuthenticationRegistry';
import { AuthorizationRegistry } from '../authorization/AuthorizationRegistry';

export class SecurityRegistry {
  private readonly _authenticationRegistry = new AuthenticationRegistry();
  private readonly _authorizationRegistry = new AuthorizationRegistry();

  public get authentication(): AuthenticationRegistry {
    return this._authenticationRegistry;
  }

  public get authorization(): AuthorizationRegistry {
    return this._authorizationRegistry;
  }

  public clear(): void {
    this._authenticationRegistry.clear();
    this._authorizationRegistry.clear();
  }
}
