export class Identity {
  public readonly id: string;
  public readonly roles: readonly string[];
  public readonly claims: Readonly<Record<string, unknown>>;
  public readonly provider: string;
  public readonly authenticatedAt: number;

  constructor(params: {
    id: string;
    roles: readonly string[];
    claims: Record<string, unknown>;
    provider: string;
    authenticatedAt?: number;
  }) {
    this.id = params.id;
    this.roles = Object.freeze([...params.roles]);
    this.claims = Object.freeze({ ...params.claims });
    this.provider = params.provider;
    this.authenticatedAt = params.authenticatedAt ?? Date.now();
    Object.freeze(this);
  }
}
