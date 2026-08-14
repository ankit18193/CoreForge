export class RuntimeNode {
  public readonly id: string;
  public readonly type: string;
  public readonly dependencies: string[] = [];

  constructor(id: string, type: string, dependencies: string[]) {
    this.id = id;
    this.type = type;
    this.dependencies = dependencies;
  }
}
