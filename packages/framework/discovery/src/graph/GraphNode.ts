export class GraphNode {
  public readonly id: string;
  public readonly dependencies: readonly string[] = [];

  constructor(id: string, dependencies: readonly string[]) {
    this.id = id;
    this.dependencies = dependencies;
  }
}
