import { Principal as IPrincipal } from '@coreforge/contracts';

export class Principal implements IPrincipal {
  public readonly id: string;
  public readonly authenticated: boolean;
  public readonly roles: readonly string[];
  public readonly claims: Readonly<Record<string, unknown>>;

  constructor(params: {
    id: string;
    authenticated: boolean;
    roles: readonly string[];
    claims: Record<string, unknown>;
  }) {
    this.id = params.id;
    this.authenticated = params.authenticated;
    this.roles = Object.freeze([...params.roles]);
    this.claims = Object.freeze({ ...params.claims });
    Object.freeze(this);
  }
}
