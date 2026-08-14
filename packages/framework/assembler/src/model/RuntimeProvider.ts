export class RuntimeProvider {
  public readonly id: string;
  public readonly parentId: string;
  public readonly serviceToken: string;
  public readonly scope: string;

  constructor(id: string, parentId: string, serviceToken: string, scope: string) {
    this.id = id;
    this.parentId = parentId;
    this.serviceToken = serviceToken;
    this.scope = scope;
    Object.freeze(this);
  }
}
