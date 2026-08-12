import { Identity } from './Identity';
import { Principal } from '../context/Principal';

export class IdentityFactory {
  public createPrincipal(identity: Identity): Principal {
    return new Principal({
      id: identity.id,
      authenticated: true,
      roles: identity.roles,
      claims: {
        ...identity.claims,
        provider: identity.provider,
        authenticatedAt: identity.authenticatedAt,
      },
    });
  }

  public createAnonymousPrincipal(): Principal {
    return new Principal({
      id: 'anonymous',
      authenticated: false,
      roles: [],
      claims: {},
    });
  }
}
