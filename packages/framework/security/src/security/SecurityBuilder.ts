import { SecurityConfiguration } from './SecurityConfiguration';
import { SecurityAuthenticationProvider } from '../authentication/AuthenticationProvider';
import { SecurityAuthorizationPolicy } from '../authorization/AuthorizationPolicy';
import { SecurityRegistry } from '../registry/SecurityRegistry';

export class SecurityBuilder {
  private readonly _registry = new SecurityRegistry();

  public registerProvider(provider: SecurityAuthenticationProvider): this {
    this._registry.authentication.register(provider);
    return this;
  }

  public registerPolicy(policy: SecurityAuthorizationPolicy): this {
    this._registry.authorization.register(policy);
    return this;
  }

  public build(): SecurityConfiguration {
    return new SecurityConfiguration({
      registry: this._registry,
    });
  }
}
