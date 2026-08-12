export class ModuleModel {
  public readonly id: string;
  public readonly name: string;
  public readonly dependencies: readonly string[];

  constructor(id: string, name: string, dependencies: readonly string[]) {
    this.id = id;
    this.name = name;
    this.dependencies = dependencies;
    Object.freeze(this);
  }
}
