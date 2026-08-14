export class RuntimeRoute {
  public readonly id: string;
  public readonly parentId: string;
  public readonly path: string;
  public readonly method: string;

  constructor(id: string, parentId: string, path: string, method: string) {
    this.id = id;
    this.parentId = parentId;
    this.path = path;
    this.method = method;
    Object.freeze(this);
  }
}
