export class ScopeMetadata {
  public readonly scopeId: string;
  public readonly createdAt: number;
  public readonly requestId?: string | undefined;
  public readonly parentScope?: string | undefined;
  public readonly owner?: string | undefined;

  constructor(params: {
    scopeId: string;
    requestId?: string;
    parentScope?: string;
    owner?: string;
  }) {
    this.scopeId = params.scopeId;
    this.createdAt = Date.now();
    this.requestId = params.requestId;
    this.parentScope = params.parentScope;
    this.owner = params.owner;
    Object.freeze(this);
  }
}
